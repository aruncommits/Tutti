import { describe, it, expect } from "vitest";
import { updatePace, applyPace, paceCategoryOf, compile, thaliV1 } from "../src/index";
import type { PaceModel, TaskNode } from "../src/index";

const chopNode = (): TaskNode => ({
  nodeId: "x", recipeId: "r", title: "Chop onions", phase: "prep", attention: "active",
  duration: { estMins: 10, minMins: 8, maxMins: 14, elastic: true },
  ingredients: [], resources: [], dependencies: [],
});
const simmerNode = (): TaskNode => ({
  nodeId: "y", recipeId: "r", title: "Simmer sauce", phase: "cook", attention: "passive",
  duration: { estMins: 15, minMins: 12, maxMins: 20, elastic: false },
  ingredients: [], resources: [], dependencies: [],
});

describe("paceCategoryOf — derive a learning category", () => {
  it("uses an explicit category, then a title keyword, then phase", () => {
    expect(paceCategoryOf({ ...chopNode(), paceCategory: "knifework" })).toBe("knifework");
    expect(paceCategoryOf(chopNode())).toBe("chop");
    expect(paceCategoryOf({ ...chopNode(), title: "Assemble platter" })).toBe("prep");
  });
});

describe("updatePace — EMA over the user's own history (Doc 2 §7)", () => {
  it("a slow cook (actual > est) raises the multiplier above 1", () => {
    const m = updatePace({}, { category: "chop", actualMins: 13, estMins: 10 });
    expect(m["chop"]!).toBeGreaterThan(1);
  });
  it("a fast cook (actual < est) lowers it below 1", () => {
    const m = updatePace({}, { category: "chop", actualMins: 7, estMins: 10 });
    expect(m["chop"]!).toBeLessThan(1);
  });
  it("converges toward the observed ratio over repeated samples", () => {
    let m: PaceModel = {};
    for (let i = 0; i < 25; i++) m = updatePace(m, { category: "chop", actualMins: 15, estMins: 10 });
    expect(m["chop"]!).toBeCloseTo(1.5, 1);
  });
});

describe("applyPace — scales only elastic tasks", () => {
  it("widens an elastic estimate for a slow cook", () => {
    const scaled = applyPace(chopNode(), { chop: 1.3 });
    expect(scaled.duration.estMins).toBe(13);
  });
  it("never scales a fixed-physics (non-elastic) task", () => {
    const scaled = applyPace(simmerNode(), { simmer: 1.5 });
    expect(scaled.duration.estMins).toBe(15);
  });
  it("cold start (no data) is the identity", () => {
    expect(applyPace(chopNode(), {})).toEqual(chopNode());
  });
});

describe("compile honors the pace model", () => {
  it("a slow cook's plan starts earlier (elastic prep takes longer)", () => {
    const { recipes, kitchenProfile, targetServeTime } = thaliV1;
    const base = compile(recipes, kitchenProfile, targetServeTime);
    const slow = compile(recipes, kitchenProfile, targetServeTime, { chop: 1.6 });
    // more elastic prep time => the meal must begin no later than the baseline.
    expect(slow.startTime <= base.startTime).toBe(true);
  });
});
