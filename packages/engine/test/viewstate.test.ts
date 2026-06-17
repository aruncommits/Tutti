import { describe, it, expect } from "vitest";
import { compile, deriveViewState, thaliV1 } from "../src/index";
import type { MasterExecutionPlan } from "../src/index";

const base = (): MasterExecutionPlan =>
  compile(thaliV1.recipes, thaliV1.kitchenProfile, thaliV1.targetServeTime);

describe("deriveViewState — three-tier view (Doc 2 §5.2)", () => {
  it("at t0, active = exactly the dependency-free nodes", () => {
    const v = deriveViewState(base());
    const expected = thaliV1.recipes
      .flatMap((r) => r.nodes)
      .filter((n) => n.dependencies.length === 0)
      .map((n) => n.nodeId)
      .sort();
    expect(v.active.map((n) => n.nodeId).sort()).toEqual(expected);
    expect(v.archive).toHaveLength(0);
  });

  it("active + queue + archive partitions every node", () => {
    const v = deriveViewState(base());
    expect(v.active.length + v.queue.length + v.archive.length).toBe(base().nodes.length);
  });

  it("completing a node promotes only newly-unblocked dependents", () => {
    const plan = base();
    // kz_4 depends on kz_2 and kz_3 — completing only kz_2 must NOT promote kz_4.
    const afterOne = { ...plan, nodes: plan.nodes.map((n) => (n.nodeId === "kz_2" ? { ...n, status: "completed" as const } : n)) };
    expect(deriveViewState(afterOne).active.map((n) => n.nodeId)).not.toContain("kz_4");
    // completing kz_3 too should now make kz_4 active.
    const afterBoth = { ...afterOne, nodes: afterOne.nodes.map((n) => (n.nodeId === "kz_3" ? { ...n, status: "completed" as const } : n)) };
    expect(deriveViewState(afterBoth).active.map((n) => n.nodeId)).toContain("kz_4");
  });

  it("sorts active by planned start time", () => {
    const v = deriveViewState(base());
    const starts = v.active.map((n) => base().schedule[n.nodeId]!.plannedStart);
    expect([...starts]).toEqual([...starts].sort());
  });

  it("exposes the projected serve time", () => {
    expect(deriveViewState(base()).projectedServeTime).toBe(thaliV1.targetServeTime);
  });
});
