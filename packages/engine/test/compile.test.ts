import { describe, it, expect } from "vitest";
import { compile, parseClock, thaliV1 } from "../src/index";

const { recipes, kitchenProfile, targetServeTime } = thaliV1;

describe("compile — MasterExecutionPlan (Doc 2 §2.4, §4)", () => {
  const plan = compile(recipes, kitchenProfile, targetServeTime);

  it("merges all nodes from all recipes, defaulting status to locked", () => {
    const total = recipes.reduce((a, r) => a + r.nodes.length, 0);
    expect(plan.nodes).toHaveLength(total);
    expect(plan.nodes.every((n) => n.status === "locked")).toBe(true);
  });

  it("anchors so the last planned end equals the target serve time", () => {
    const lastEnd = Math.max(...Object.values(plan.schedule).map((s) => parseClock(s.plannedEnd)));
    expect(lastEnd).toBe(parseClock(targetServeTime));
    expect(plan.projectedServeTime).toBe(targetServeTime);
  });

  it("reports the dependency-only critical path and its length", () => {
    expect(plan.criticalPath).toEqual(["kz_2", "kz_4", "kz_5"]);
    expect(plan.criticalPathMins).toBe(30);
  });

  it("has a schedule entry for every node", () => {
    for (const n of plan.nodes) expect(plan.schedule[n.nodeId]).toBeDefined();
  });

  it("is deterministic — identical inputs yield a byte-identical plan (invariant 6)", () => {
    const again = compile(recipes, kitchenProfile, targetServeTime);
    expect(again).toEqual(plan);
    expect(again.sessionId).toBe(plan.sessionId);
  });

  it("matches the golden thali snapshot", () => {
    expect(plan).toMatchSnapshot();
  });
});
