import { describe, it, expect } from "vitest";
import { shouldLearn } from "./learn";
import type { TaskNode } from "@tutti/engine";

const node = (over: Partial<TaskNode> = {}): TaskNode => ({
  nodeId: "n", recipeId: "r", title: "Chop onions", phase: "prep", attention: "active",
  duration: { estMins: 10, minMins: 8, maxMins: 14, elastic: true },
  ingredients: [], resources: [], dependencies: [], ...over,
});

describe("shouldLearn — pace-learning guard (Brief v6 item 5, Doc 10 §3.2)", () => {
  it("learns from an in-band elastic active task when opted in", () => {
    expect(shouldLearn(node(), 12, true)).toBe(true);
  });
  it("does not learn when opted out", () => {
    expect(shouldLearn(node(), 12, false)).toBe(false);
  });
  it("does not learn from non-elastic (fixed-physics) tasks", () => {
    expect(shouldLearn(node({ duration: { estMins: 15, minMins: 12, maxMins: 20, elastic: false } }), 15, true)).toBe(false);
  });
  it("does not learn from passive tasks", () => {
    expect(shouldLearn(node({ attention: "passive" }), 12, true)).toBe(false);
  });
  it("rejects outliers below 0.3x min and above 3x max", () => {
    expect(shouldLearn(node(), 2, true)).toBe(false); // 0.3*8 = 2.4 floor
    expect(shouldLearn(node(), 50, true)).toBe(false); // 3*14 = 42 ceiling
  });
});
