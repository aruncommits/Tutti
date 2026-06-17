// Scheduling core (Doc 2 §4). BUILD ORDER (Brief v1):
//   item 1 (this file, first pass): dependency-only CPM — topo sort, forward/backward
//           pass, critical path. Resource-aware list scheduling + hands + reverse
//           anchoring are layered on in later items.
// Pure functions over plain data. No LLM, no UI, no clock on the cooking path.

import type { TaskNode } from "./types";

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
