// reschedule — keep the timeline truthful as reality diverges (Doc 2 §6). Re-runs the resource
// forward pass on the remaining (not-completed) nodes anchored at `now`, recomputes the projected
// serve time and slack, and emits a nextStartAlert for the soonest not-yet-started critical node.
// Runs in microseconds; never reorders what the cook is currently doing.

import type { MasterExecutionPlan } from "./types";
import { anchor, criticalPathMethod, scheduleForward } from "./schedule";
import { formatClock, parseClock } from "./time";

export function reschedule(plan: MasterExecutionPlan, nowClock: string): MasterExecutionPlan {
  const nowMins = parseClock(nowClock);
  const remaining = plan.nodes.filter((n) => n.status !== "completed");

  if (remaining.length === 0) {
    return { ...plan, startTime: nowClock, projectedServeTime: nowClock, nextStartAlert: null, runningLate: false };
  }

  // completed dependencies simply vanish from the set → treated as satisfied by the scheduler.
  const forward = scheduleForward(remaining, plan.kitchenProfile);
  // anchoring to a target of (now + makespan) clamps the start to exactly `now`.
  const anchored = anchor(remaining, forward, formatClock(nowMins + forward.makespanMins));

  const schedule = { ...plan.schedule };
  for (const [id, entry] of Object.entries(anchored.schedule)) schedule[id] = entry;

  const projectedServeTime = anchored.projectedServeTime;
  const runningLate = parseClock(projectedServeTime) > parseClock(plan.targetServeTime);

  // nextStartAlert: soonest not-yet-active critical node among the remaining set.
  const critical = criticalPathMethod(remaining).criticalPath;
  const startOffset = new Map(Object.entries(forward.entries).map(([id, e]) => [id, e.start]));
  let alert: string | null = null;
  let soonest = Infinity;
  for (const id of critical) {
    const node = remaining.find((n) => n.nodeId === id);
    if (!node || node.status === "active") continue; // already started/startable
    const off = startOffset.get(id) ?? Infinity;
    if (off < soonest) {
      soonest = off;
      alert = off <= 0 ? `Start ${node.title} now to stay on time` : `Start ${node.title} in ${off} min to stay on time`;
    }
  }

  return {
    ...plan,
    startTime: anchored.startTime,
    projectedServeTime,
    criticalPathMins: criticalPathMethod(remaining).makespanMins,
    schedule,
    nextStartAlert: alert,
    runningLate,
  };
}
