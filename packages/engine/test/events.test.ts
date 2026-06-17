import { describe, it, expect } from "vitest";
import { compile, applyEvent, deriveViewState, thaliV1 } from "../src/index";
import type { MasterExecutionPlan } from "../src/index";

const base = (): MasterExecutionPlan =>
  compile(thaliV1.recipes, thaliV1.kitchenProfile, thaliV1.targetServeTime);
const statusOf = (p: MasterExecutionPlan, id: string) => p.nodes.find((n) => n.nodeId === id)!.status;
const completedCount = (p: MasterExecutionPlan) => p.nodes.filter((n) => n.status === "completed").length;

describe("applyEvent — completion traversal (Doc 2 §5.3)", () => {
  it("completing both of kz_4's dependencies promotes kz_4 to active", () => {
    let p = base();
    expect(statusOf(p, "kz_4")).toBe("locked");
    p = applyEvent(p, { type: "complete", nodeId: "kz_2", at: "18:45:00" });
    expect(statusOf(p, "kz_4")).toBe("locked"); // kz_3 not done yet
    p = applyEvent(p, { type: "complete", nodeId: "kz_3", at: "18:48:00" });
    expect(statusOf(p, "kz_4")).toBe("active"); // both deps done -> promoted
  });

  it("undo re-locks a dependent whose dependency is no longer complete", () => {
    let p = base();
    p = applyEvent(p, { type: "complete", nodeId: "kz_2", at: "18:45:00" });
    p = applyEvent(p, { type: "complete", nodeId: "kz_3", at: "18:48:00" });
    expect(statusOf(p, "kz_4")).toBe("active");
    p = applyEvent(p, { type: "undo", nodeId: "kz_2", at: "18:49:00" });
    expect(statusOf(p, "kz_2")).not.toBe("completed");
    expect(statusOf(p, "kz_4")).toBe("locked"); // dep undone -> re-locked
  });

  it("monotonic progress: completed count rises on complete, only falls on undo (invariant 4)", () => {
    let p = base();
    const c0 = completedCount(p);
    p = applyEvent(p, { type: "complete", nodeId: "ri_1", at: "18:40:00" });
    expect(completedCount(p)).toBe(c0 + 1);
    p = applyEvent(p, { type: "complete", nodeId: "po_1", at: "18:50:00" });
    expect(completedCount(p)).toBe(c0 + 2);
    p = applyEvent(p, { type: "undo", nodeId: "po_1", at: "18:51:00" });
    expect(completedCount(p)).toBe(c0 + 1);
  });

  it("a completed node lands in the archive view", () => {
    const p = applyEvent(base(), { type: "complete", nodeId: "ri_1", at: "18:40:00" });
    expect(deriveViewState(p).archive.map((n) => n.nodeId)).toContain("ri_1");
  });

  it("does not mutate the input plan (pure)", () => {
    const p0 = base();
    const snapshot = JSON.stringify(p0);
    applyEvent(p0, { type: "complete", nodeId: "ri_1", at: "18:40:00" });
    expect(JSON.stringify(p0)).toBe(snapshot);
  });
});
