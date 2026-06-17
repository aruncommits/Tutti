import { describe, it, expect } from "vitest";
import { scheduleForward, nodeRequirements, normalizeKitchen, capacityOf, HANDS, thaliV1 } from "../src/index";
import type { ForwardSchedule, TaskNode } from "../src/index";

const nodes: TaskNode[] = thaliV1.recipes.flatMap((r) => r.nodes);
const byId = new Map(nodes.map((n) => [n.nodeId, n]));
const kitchen = thaliV1.kitchenProfile;
const sched: ForwardSchedule = scheduleForward(nodes, kitchen);

/** Peak concurrent usage of a resource category across the whole schedule. */
function peakConcurrent(category: string): number {
  const deltas: Array<[number, number]> = [];
  for (const n of nodes) {
    const units = nodeRequirements(n).filter((r) => r.category === category).reduce((a, r) => a + r.count, 0);
    if (units === 0) continue;
    const e = sched.entries[n.nodeId]!;
    deltas.push([e.start, units], [e.end, -units]);
  }
  deltas.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let peak = 0;
  for (const [, d] of deltas) {
    cur += d;
    if (cur > peak) peak = cur;
  }
  return peak;
}

describe("scheduleForward — resource feasibility on the thali (Doc 2 §4.3)", () => {
  it("never schedules more burner tasks than there are burners (2)", () => {
    expect(capacityOf(normalizeKitchen(kitchen), "burner")).toBe(2);
    expect(peakConcurrent("burner")).toBeLessThanOrEqual(2);
  });

  it("never overlaps two active tasks for a single cook (hands = 1)", () => {
    expect(peakConcurrent(HANDS)).toBeLessThanOrEqual(1);
  });

  it("respects the one cutting board (1)", () => {
    expect(peakConcurrent("cutting_board")).toBeLessThanOrEqual(1);
  });

  it("honors dependencies (no node starts before a dependency ends)", () => {
    for (const n of nodes) {
      for (const dep of n.dependencies) {
        expect(sched.entries[n.nodeId]!.start).toBeGreaterThanOrEqual(sched.entries[dep]!.end);
      }
    }
  });
});

describe("interleaving is automatic (the product)", () => {
  it("hides active work inside a passive window — some active task runs during a passive one", () => {
    const passive = nodes.filter((n) => n.attention === "passive");
    const active = nodes.filter((n) => n.attention === "active");
    const overlaps = active.some((a) => {
      const ae = sched.entries[a.nodeId]!;
      return passive.some((p) => {
        const pe = sched.entries[p.nodeId]!;
        return ae.start >= pe.start && ae.end <= pe.end; // active fully inside a passive window
      });
    });
    expect(overlaps).toBe(true);
  });

  it("beats the linear baseline: makespan well under the 91-min serial sum", () => {
    const serial = nodes.reduce((a, n) => a + n.duration.estMins, 0);
    expect(serial).toBe(91);
    expect(sched.makespanMins).toBeLessThan(serial);
    expect(sched.makespanMins).toBeLessThanOrEqual(60);
  });

  it("is deterministic (identical schedule across runs)", () => {
    expect(scheduleForward(nodes, kitchen)).toEqual(sched);
  });
});
