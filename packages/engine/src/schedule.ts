// Scheduling core (Doc 2 §4). BUILD ORDER (Brief v1):
//   item 1 (this file, first pass): dependency-only CPM — topo sort, forward/backward
//           pass, critical path. Resource-aware list scheduling + hands + reverse
//           anchoring are layered on in later items.
// Pure functions over plain data. No LLM, no UI, no clock on the cooking path.

import type { KitchenProfile, ResourceRequirement, TaskNode } from "./types";
import { capacityOf, nodeRequirements, normalizeKitchen } from "./resources";

/** Deterministic topological order (Kahn's, ties broken by nodeId for stable output). */
export function topoSort(nodes: Pick<TaskNode, "nodeId" | "dependencies">[]): string[] {
  const ids = new Set(nodes.map((n) => n.nodeId));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const n of nodes) inDegree.set(n.nodeId, 0);
  for (const n of nodes) {
    for (const dep of n.dependencies) {
      if (!ids.has(dep)) continue;
      inDegree.set(n.nodeId, (inDegree.get(n.nodeId) ?? 0) + 1);
      dependents.set(dep, [...(dependents.get(dep) ?? []), n.nodeId]);
    }
  }
  // ready set kept sorted so equal-priority nodes emit in a stable order.
  const ready = [...inDegree.entries()].filter(([, d]) => d === 0).map(([id]) => id).sort();
  const order: string[] = [];
  while (ready.length) {
    const id = ready.shift()!;
    order.push(id);
    for (const m of (dependents.get(id) ?? []).slice().sort()) {
      const d = (inDegree.get(m) ?? 0) - 1;
      inDegree.set(m, d);
      if (d === 0) {
        // insert keeping `ready` sorted
        let i = 0;
        while (i < ready.length && ready[i]! < m) i++;
        ready.splice(i, 0, m);
      }
    }
  }
  if (order.length !== nodes.length) throw new Error("topoSort: graph has a cycle");
  return order;
}

export interface CpmEntry {
  earliestStart: number; // minutes from t0
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slackMins: number;
}

export interface CpmResult {
  entries: Record<string, CpmEntry>;
  makespanMins: number;
  /** the longest dependency-respecting chain (zero slack); minimum possible makespan. */
  criticalPath: string[];
}

const durOf = (n: TaskNode): number => n.duration.estMins;

/**
 * Critical Path Method over a node set, dependencies only (resources ignored here — that is
 * the resource-aware forward pass in a later item). Returns earliest/latest/slack per node,
 * the makespan, and a single deterministic critical path.
 */
export function criticalPathMethod(nodes: TaskNode[]): CpmResult {
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const order = topoSort(nodes);
  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  // forward pass
  for (const id of order) {
    const n = byId.get(id)!;
    const start = n.dependencies.reduce((mx, dep) => Math.max(mx, ef.get(dep) ?? 0), 0);
    es.set(id, start);
    ef.set(id, start + durOf(n));
  }
  const makespan = Math.max(0, ...order.map((id) => ef.get(id)!));

  // dependents map for backward pass
  const dependents = new Map<string, string[]>();
  for (const n of nodes) for (const dep of n.dependencies) {
    if (byId.has(dep)) dependents.set(dep, [...(dependents.get(dep) ?? []), n.nodeId]);
  }

  // backward pass
  const lf = new Map<string, number>();
  const ls = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const n = byId.get(id)!;
    const deps = dependents.get(id) ?? [];
    const finish = deps.length ? Math.min(...deps.map((m) => ls.get(m)!)) : makespan;
    lf.set(id, finish);
    ls.set(id, finish - durOf(n));
  }

  const entries: Record<string, CpmEntry> = {};
  for (const id of order) {
    entries[id] = {
      earliestStart: es.get(id)!,
      earliestFinish: ef.get(id)!,
      latestStart: ls.get(id)!,
      latestFinish: lf.get(id)!,
      slackMins: ls.get(id)! - es.get(id)!,
    };
  }

  return { entries, makespanMins: makespan, criticalPath: reconstructCriticalPath(byId, es, ef, makespan) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource-aware greedy list scheduling (Doc 2 §4.3) — item 3.
// RCPSP is NP-hard; we use a deterministic greedy priority heuristic: a feasible,
// dependency- and resource-correct schedule that beats human juggling (not the optimum).
// ─────────────────────────────────────────────────────────────────────────────

interface Interval {
  start: number;
  end: number;
}

export interface ForwardScheduleEntry {
  start: number; // minutes from t0
  end: number;
}

export interface ForwardSchedule {
  entries: Record<string, ForwardScheduleEntry>;
  makespanMins: number;
}

/** Peak concurrent usage of one resource category within the half-open window [from, to). */
function peakUsage(intervals: Interval[], from: number, to: number): number {
  const deltas: Array<[number, number]> = [];
  for (const iv of intervals) {
    const s = Math.max(iv.start, from);
    const e = Math.min(iv.end, to);
    if (s < e) {
      deltas.push([s, 1]);
      deltas.push([e, -1]);
    }
  }
  // releases (-1) before claims (+1) at the same instant → back-to-back tasks don't collide.
  deltas.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let peak = 0;
  for (const [, d] of deltas) {
    cur += d;
    if (cur > peak) peak = cur;
  }
  return peak;
}

/** Earliest t ≥ minStart where every required resource has room for the whole duration. */
function earliestFeasibleStart(
  reqs: ResourceRequirement[],
  capOf: (c: string) => number,
  timeline: Map<string, Interval[]>,
  minStart: number,
  dur: number,
): number {
  // Feasibility only opens at minStart or when some required resource is released.
  const candidates = new Set<number>([minStart]);
  for (const req of reqs) {
    for (const iv of timeline.get(req.category) ?? []) {
      if (iv.end > minStart) candidates.add(iv.end);
    }
  }
  const sorted = [...candidates].sort((a, b) => a - b);
  for (const t of sorted) {
    let ok = true;
    for (const req of reqs) {
      // clamp so a node needing more than the kitchen has still schedules (degrade, never hang).
      const cap = Math.max(capOf(req.category), req.count);
      if (peakUsage(timeline.get(req.category) ?? [], t, t + dur) + req.count > cap) {
        ok = false;
        break;
      }
    }
    if (ok) return t;
  }
  return minStart; // unreachable in practice (clamped capacity guarantees a candidate)
}

/**
 * Greedy resource-constrained forward schedule (Doc 2 §4.3). Merges all nodes, models hands as
 * a resource, and slots each node — in priority order — at its earliest feasible start. Cross-
 * dish interleaving falls out automatically: a one-cook kitchen has one hands unit, so active
 * tasks never overlap, and they naturally fill another task's passive (hands-free) window.
 *
 * Priority among schedulable nodes: on the critical path first, then least slack, then longest
 * duration, then nodeId (determinism).
 */
export function scheduleForward(nodes: TaskNode[], kitchen: KitchenProfile): ForwardSchedule {
  const k = normalizeKitchen(kitchen);
  const capOf = (c: string) => capacityOf(k, c);
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));

  const cpm = criticalPathMethod(nodes);
  const onCritical = new Set(cpm.criticalPath);
  const priority = (id: string): [number, number, number, string] => [
    onCritical.has(id) ? 0 : 1, // critical first
    cpm.entries[id]!.slackMins, // least slack
    -byId.get(id)!.duration.estMins, // longest duration
    id, // stable
  ];
  const lessPriority = (a: string, b: string): boolean => {
    const pa = priority(a);
    const pb = priority(b);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] as number) !== (pb[i] as number)) return (pa[i] as number) < (pb[i] as number);
    }
    return (pa[3] as string) < (pb[3] as string);
  };

  const timeline = new Map<string, Interval[]>();
  const entries: Record<string, ForwardScheduleEntry> = {};
  const scheduled = new Set<string>();

  const depsScheduled = (n: TaskNode) => n.dependencies.every((d) => !byId.has(d) || scheduled.has(d));

  while (scheduled.size < nodes.length) {
    const ready = nodes.filter((n) => !scheduled.has(n.nodeId) && depsScheduled(n)).map((n) => n.nodeId);
    if (ready.length === 0) throw new Error("scheduleForward: deadlock (cycle?)");
    ready.sort((a, b) => (lessPriority(a, b) ? -1 : 1));
    const id = ready[0]!;
    const node = byId.get(id)!;
    const reqs = nodeRequirements(node);
    const minStart = node.dependencies.reduce((mx, d) => Math.max(mx, entries[d]?.end ?? 0), 0);
    const dur = node.duration.estMins;
    const start = earliestFeasibleStart(reqs, capOf, timeline, minStart, dur);
    const end = start + dur;
    entries[id] = { start, end };
    for (const req of reqs) {
      const list = timeline.get(req.category) ?? [];
      for (let i = 0; i < req.count; i++) list.push({ start, end });
      timeline.set(req.category, list);
    }
    scheduled.add(id);
  }

  const makespan = Math.max(0, ...Object.values(entries).map((e) => e.end));
  return { entries, makespanMins: makespan };
}

/** Trace one longest chain: from a makespan-ending node back through binding dependencies. */
function reconstructCriticalPath(
  byId: Map<string, TaskNode>,
  es: Map<string, number>,
  ef: Map<string, number>,
  makespan: number,
): string[] {
  if (makespan === 0) return [];
  const ends = [...byId.keys()].filter((id) => ef.get(id) === makespan).sort();
  let cur: string | undefined = ends[0];
  const path: string[] = [];
  while (cur) {
    path.push(cur);
    const n = byId.get(cur)!;
    // binding predecessor: a dependency whose finish == this node's start (it set the start)
    const binding = n.dependencies
      .filter((dep) => byId.has(dep) && ef.get(dep) === es.get(cur!))
      .sort();
    cur = binding[0];
  }
  return path.reverse();
}
