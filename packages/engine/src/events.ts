// applyEvent — runtime state transitions (Doc 2 §5.3). At cook time there is no scheduling
// math on the critical path; completing/undoing a node just flips status and re-derives which
// nodes are now active (promotion) or locked again (after undo). Pure and instant.

import type { CookEvent, MasterExecutionPlan, NodeStatus, TaskNode } from "./types";
import { reschedule } from "./reschedule";

/** Recompute locked/active for every non-completed node from the current completed set. */
function recompute(nodes: TaskNode[]): TaskNode[] {
  const ids = new Set(nodes.map((n) => n.nodeId));
  const completed = new Set(nodes.filter((n) => n.status === "completed").map((n) => n.nodeId));
  return nodes.map((n) => {
    if (n.status === "completed") return n;
    const ready = n.dependencies.every((d) => !ids.has(d) || completed.has(d));
    const status: NodeStatus = ready ? "active" : "locked";
    return n.status === status ? n : { ...n, status };
  });
}

/**
 * Apply a cook event and return a new plan. `complete` marks the node done and promotes any
 * node whose dependencies are now all met; `undo` reverts it and re-locks dependents whose
 * dependencies are no longer all met (Doc 2 §8). Out-of-order completion is allowed (P5) — the
 * UI may warn, but the engine never hard-blocks. (Live time recompute is reschedule(), item 8.)
 */
export function applyEvent(plan: MasterExecutionPlan, event: CookEvent): MasterExecutionPlan {
  let nodes = plan.nodes;
  switch (event.type) {
    case "complete":
      nodes = nodes.map((n) => (n.nodeId === event.nodeId ? { ...n, status: "completed" as const } : n));
      break;
    case "undo":
      nodes = nodes.map((n) => (n.nodeId === event.nodeId ? { ...n, status: "locked" as const } : n));
      break;
    case "start":
      nodes = nodes.map((n) => (n.nodeId === event.nodeId ? { ...n, status: "active" as const } : n));
      break;
  }
  const next = { ...plan, nodes: recompute(nodes) };
  // keep the clock honest when a real timestamp is supplied (Doc 2 §5.3 -> §6).
  return event.at ? reschedule(next, event.at) : next;
}
