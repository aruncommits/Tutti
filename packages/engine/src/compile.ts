// compile() — the public entry to the engine (Doc 2 §1, §2.4, §4). Pure: given recipes, a
// kitchen, and a target serve time, it merges the graphs, resource-schedules them, and anchors
// to the serve time, returning the MasterExecutionPlan the UI cooks from. No LLM, no clock,
// no side effects — identical inputs yield a byte-identical plan (invariant 6).

import type { KitchenProfile, MasterExecutionPlan, RecipeGraph, TaskNode } from "./types";
import { anchor, criticalPathMethod, scheduleForward } from "./schedule";
import { applyPace } from "./pace";

/** Per-category speed multipliers learned from a user's history (Doc 2 §7). Applied in a later
 *  item once nodes carry a pace category; accepted here so the signature is stable. */
export type PaceModel = Record<string, number>;

/** Small deterministic string hash (FNV-1a) so sessionId is stable for snapshot testing. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function compile(
  recipes: RecipeGraph[],
  kitchenProfile: KitchenProfile,
  targetServeTime: string,
  paceModel?: PaceModel,
  manualOrder?: string[], // optional cook-chosen step order (honored where deps/resources allow)
): MasterExecutionPlan {
  // merge: recipes are independent graphs sharing only resources, never dependencies (Doc 2 §4.1).
  // Apply the user's pace multipliers to elastic durations before scheduling (Doc 2 §7).
  const nodes: TaskNode[] = recipes.flatMap((r) =>
    r.nodes.map((n) => {
      const withStatus = { ...n, status: "locked" as const };
      return paceModel ? applyPace(withStatus, paceModel) : withStatus;
    }),
  );

  const forward = scheduleForward(nodes, kitchenProfile, manualOrder);
  const anchored = anchor(nodes, forward, targetServeTime);
  const cpm = criticalPathMethod(nodes);

  const sessionId =
    "session_" + hash(recipes.map((r) => `${r.recipeId}@${r.version}`).join("+") + "|" + targetServeTime + "|" + kitchenProfile.cooks);

  return {
    sessionId,
    targetServeTime,
    startTime: anchored.startTime,
    kitchenProfile,
    nodes,
    criticalPathMins: cpm.makespanMins, // dependency-only floor: the irreducible cook time
    criticalPath: cpm.criticalPath,
    projectedServeTime: anchored.projectedServeTime,
    schedule: anchored.schedule,
  };
}
