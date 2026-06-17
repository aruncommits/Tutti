import { describe, it, expect } from "vitest";
import { scheduleForward, anchor, parseClock, formatClock, thaliV1 } from "../src/index";
import type { TaskNode } from "../src/index";

const nodes: TaskNode[] = thaliV1.recipes.flatMap((r) => r.nodes);
const forward = scheduleForward(nodes, thaliV1.kitchenProfile);

describe("time helpers", () => {
  it("round-trips clock <-> minutes", () => {
    expect(parseClock("19:30:00")).toBe(1170);
    expect(parseClock("19:30")).toBe(1170);
    expect(formatClock(1170)).toBe("19:30:00");
  });
  it("wraps across midnight", () => {
    expect(formatClock(-15)).toBe("23:45:00");
    expect(formatClock(1440 + 5)).toBe("00:05:00");
  });
});

describe("anchor — reverse target-time scheduling (Doc 2 §4.5)", () => {
  const a = anchor(nodes, forward, "19:30:00");

  it("starts exactly makespan minutes before the target", () => {
    expect(a.startTimeMins).toBe(parseClock("19:30:00") - forward.makespanMins);
    expect(a.startTime).toBe(formatClock(parseClock("19:30:00") - forward.makespanMins));
  });

  it("makes the last node finish at the target serve time", () => {
    const lastEnd = Math.max(...Object.values(a.schedule).map((s) => parseClock(s.plannedEnd)));
    expect(lastEnd).toBe(parseClock("19:30:00"));
    expect(a.projectedServeTime).toBe("19:30:00");
    expect(a.feasible).toBe(true);
  });

  it("gives every node a planned window consistent with its earliest start offset", () => {
    for (const [id, s] of Object.entries(a.schedule)) {
      expect(parseClock(s.plannedStart)).toBe(a.startTimeMins + s.earliestStart);
      void id;
    }
  });

  it("reports the earliest realistic serve time when the deadline is infeasible (P7)", () => {
    // It is 19:20 but the meal needs `makespan` (> 10) minutes — cannot serve by 19:30.
    const late = anchor(nodes, forward, "19:30:00", "19:20:00");
    expect(late.feasible).toBe(false);
    expect(late.startTime).toBe("19:20:00"); // start now, not in the past
    expect(parseClock(late.earliestServeTime)).toBe(parseClock("19:20:00") + forward.makespanMins);
  });
});
