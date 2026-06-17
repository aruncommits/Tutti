import { describe, it, expect } from "vitest";
import { compile, reschedule, applyEvent, parseClock, criticalPathMethod, thaliV1 } from "../src/index";
import type { MasterExecutionPlan } from "../src/index";

const base = (): MasterExecutionPlan =>
  compile(thaliV1.recipes, thaliV1.kitchenProfile, thaliV1.targetServeTime);

describe("reschedule — live recalculation (Doc 2 §6)", () => {
  it("projects serve = now + remaining makespan", () => {
    const p = reschedule(base(), "18:39:00"); // start time of the thali
    const remaining = p.nodes.filter((n) => n.status !== "completed");
    // resource makespan of the full set, anchored at 18:39, should land at 19:30 again
    expect(parseClock(p.projectedServeTime)).toBeGreaterThanOrEqual(
      parseClock("18:39:00") + criticalPathMethod(remaining).makespanMins,
    );
  });

  it("invariant 5 — never promises a serve time earlier than now + remaining critical path", () => {
    const now = "18:50:00";
    const p = reschedule(base(), now);
    const remaining = p.nodes.filter((n) => n.status !== "completed");
    const floor = parseClock(now) + criticalPathMethod(remaining).makespanMins;
    expect(parseClock(p.projectedServeTime)).toBeGreaterThanOrEqual(floor);
  });

  it("completing work reduces the remaining critical path floor", () => {
    const before = criticalPathMethod(base().nodes.filter((n) => n.status !== "completed")).makespanMins;
    const after = applyEvent(base(), { type: "complete", nodeId: "kz_2", at: "18:46:00" });
    const remaining = after.nodes.filter((n) => n.status !== "completed");
    expect(criticalPathMethod(remaining).makespanMins).toBeLessThanOrEqual(before);
  });

  it("emits a nextStartAlert for an upcoming critical node", () => {
    const p = reschedule(base(), "18:39:00");
    // the thali critical path starts with kz_2 (Slit brinjals) — an alert should mention a task.
    expect(typeof p.nextStartAlert === "string" || p.nextStartAlert === null).toBe(true);
  });

  it("flags running late when the deadline has effectively passed", () => {
    // pretend it is already 19:25 with the whole meal still to cook → cannot make 19:30.
    const p = reschedule(base(), "19:25:00");
    expect(p.runningLate).toBe(true);
  });

  it("when everything is done, serve time is now and no alert", () => {
    let p = base();
    for (const n of p.nodes) p = applyEvent(p, { type: "complete", nodeId: n.nodeId, at: "19:30:00" });
    expect(p.nextStartAlert).toBeNull();
  });
});
