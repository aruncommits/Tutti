// deriveViewState — the three-tier UI as one pure filter over node status (Doc 2 §5.2).
// The UI never decides what to show; it asks this function. No scheduling math here — at cook
// time there is only state transition + this derivation, both instant.

import type { MasterExecutionPlan, TaskNode, ViewState } from "./types";

export function deriveViewState(plan: MasterExecutionPlan): ViewState {
  const byId = new Map(plan.nodes.map((n) => [n.nodeId, n]));
  const isCompleted = (id: string) => byId.get(id)?.status === "completed";
  const startOf = (n: TaskNode) => plan.schedule[n.nodeId]?.plannedStart ?? "";

  const active = plan.nodes.filter(
    (n) => n.status !== "completed" && n.dependencies.every((d) => !byId.has(d) || isCompleted(d)),
  );
  const activeIds = new Set(active.map((n) => n.nodeId));
  const archive = plan.nodes.filter((n) => n.status === "completed");
  const queue = plan.nodes.filter((n) => n.status !== "completed" && !activeIds.has(n.nodeId));

  active.sort((a, b) => startOf(a).localeCompare(startOf(b)));
  queue.sort((a, b) => startOf(a).localeCompare(startOf(b)));

  return {
    active,
    queue,
    archive,
    projectedServeTime: plan.projectedServeTime,
    nextStartAlert: null, // populated by reschedule() once the live clock is in play (item 8)
  };
}
