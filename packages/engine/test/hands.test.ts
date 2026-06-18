import { describe, it, expect } from "vitest";
import { compile, thaliV1, parseClock, type KitchenProfile } from "../src/index";

const ample = (cooks: number): KitchenProfile => ({
  cooks,
  resources: [
    { category: "burner", count: 4 },
    { category: "pan", count: 4, capabilities: ["small", "large"] },
    { category: "pressure_cooker", count: 1 },
    { category: "cutting_board", count: 2 },
    { category: "blender", count: 1 },
  ],
});

const overlaps = (a: { s: number; e: number }, b: { s: number; e: number }) => a.s < b.e && b.s < a.e;

describe("hands-lanes (Brief v14 item 1)", () => {
  it("assigns every active task a hand and leaves passive tasks lane-less", () => {
    const plan = compile(thaliV1.recipes, ample(2), "19:30:00");
    for (const n of plan.nodes) {
      const e = plan.schedule[n.nodeId]!;
      if (n.attention === "active") expect(typeof e.hand).toBe("number");
      else expect(e.hand).toBeUndefined();
    }
  });

  it("no two time-overlapping active tasks share a hand, and ≥2 lanes are used with 2 cooks", () => {
    const plan = compile(thaliV1.recipes, ample(2), "19:30:00");
    const active = plan.nodes
      .filter((n) => n.attention === "active")
      .map((n) => {
        const e = plan.schedule[n.nodeId]!;
        return { hand: e.hand!, s: parseClock(e.plannedStart), e: parseClock(e.plannedEnd) };
      });

    let sawConcurrentDistinct = false;
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        if (overlaps(active[i]!, active[j]!)) {
          // exclusivity invariant: overlapping active tasks must be on different hands
          expect(active[i]!.hand).not.toBe(active[j]!.hand);
          sawConcurrentDistinct = true;
        }
      }
    }
    expect(sawConcurrentDistinct).toBe(true); // 2 cooks genuinely parallelize the thali
    expect(new Set(active.map((a) => a.hand)).size).toBeGreaterThanOrEqual(2);
  });

  it("uses a single lane (hand 0) when cooking solo", () => {
    const plan = compile(thaliV1.recipes, ample(1), "19:30:00");
    const hands = plan.nodes
      .filter((n) => n.attention === "active")
      .map((n) => plan.schedule[n.nodeId]!.hand);
    expect(new Set(hands)).toEqual(new Set([0]));
  });
});
