// Offline validation gate (Doc 2 §3). Deterministic checks that let a human trust LLM output.
// This is the first real seed of the engine; the loop (Brief v1) extends it (REACH, LINT).

import type { RecipeGraph, TaskNode, ValidationResult } from "./types";

const PHASES = new Set(["prep", "cook", "serve"]);
const ATTENTIONS = new Set(["active", "passive"]);

/** Kahn's algorithm. Returns true if the node set (by id, with deps) is acyclic. */
export function isAcyclic(nodes: Pick<TaskNode, "nodeId" | "dependencies">[]): boolean {
  const ids = new Set(nodes.map((n) => n.nodeId));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const n of nodes) inDegree.set(n.nodeId, 0);
  for (const n of nodes) {
    for (const dep of n.dependencies) {
      if (!ids.has(dep)) continue; // dangling refs handled separately
      inDegree.set(n.nodeId, (inDegree.get(n.nodeId) ?? 0) + 1);
      dependents.set(dep, [...(dependents.get(dep) ?? []), n.nodeId]);
    }
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) if (deg === 0) queue.push(id);
  let count = 0;
  while (queue.length) {
    const id = queue.pop()!;
    count++;
    for (const m of dependents.get(id) ?? []) {
      const d = (inDegree.get(m) ?? 0) - 1;
      inDegree.set(m, d);
      if (d === 0) queue.push(m);
    }
  }
  return count === nodes.length;
}

/** Validate a single RecipeGraph (Doc 2 §3 steps SCHEMA, REF, ACYCLIC). */
export function validate(graph: RecipeGraph): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();

  for (const n of graph.nodes) {
    if (ids.has(n.nodeId)) errors.push(`duplicate nodeId: ${n.nodeId}`);
    ids.add(n.nodeId);
    if (!PHASES.has(n.phase)) errors.push(`${n.nodeId}: invalid phase "${n.phase}"`);
    if (!ATTENTIONS.has(n.attention)) errors.push(`${n.nodeId}: invalid attention "${n.attention}"`);
    if (n.status) warnings.push(`${n.nodeId}: library node should not set runtime "status"`);
  }

  for (const n of graph.nodes) {
    for (const dep of n.dependencies) {
      if (!ids.has(dep)) errors.push(`${n.nodeId}: dependency "${dep}" does not resolve to a node`);
    }
  }

  if (!isAcyclic(graph.nodes)) errors.push("cycle detected in dependency graph (REJECT)");

  return { ok: errors.length === 0, errors, warnings };
}
