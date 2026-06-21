import { describe, it, expect } from "vitest";
import { scheduleForward, thaliV1 } from "../src/index";
import type { TaskNode } from "../src/index";

const kitchen = thaliV1.kitchenProfile; // single cook (hands = 1) → active tasks serialize

const active = (nodeId: string, deps: string[] = []): TaskNode => ({
  nodeId, recipeId: "r", title: nodeId, instruction: nodeId,
  phase: "prep", attention: "active",
  duration: { estMins: 10, minMins: 7, maxMins: 15, elastic: false },
  ingredients: [], resources: [], dependencies: deps,
});

describe("scheduleForward — optional manualOrder", () => {
  it("is a no-op without manualOrder (identical schedule)", () => {
    const nodes = [active("a"), active("b"), active("c")];
    expect(scheduleForward(nodes, kitchen)).toEqual(scheduleForward(nodes, kitchen, []));
  });

  it("honors the user's order among independent ready tasks", () => {
    const nodes = [active("a"), active("b"), active("c")];
    const def = scheduleForward(nodes, kitchen); // default: a, b, c (id order)
    expect(def.entries.a!.start).toBeLessThan(def.entries.b!.start);

    const reordered = scheduleForward(nodes, kitchen, ["c", "b", "a"]);
    expect(reordered.entries.c!.start).toBe(0); // c chosen first
    expect(reordered.entries.b!.start).toBeLessThan(reordered.entries.a!.start);
  });

  it("never lets manualOrder violate dependencies", () => {
    // b depends on a, but the user asks for b first — a must still run before b.
    const nodes = [active("a"), active("b", ["a"])];
    const s = scheduleForward(nodes, kitchen, ["b", "a"]);
    expect(s.entries.a!.end).toBeLessThanOrEqual(s.entries.b!.start);
  });
});
