import { describe, it, expect } from "vitest";
import { topoSort, criticalPathMethod, thaliV1 } from "../src/index";
import type { TaskNode } from "../src/index";

const thaliNodes: TaskNode[] = thaliV1.recipes.flatMap((r) => r.nodes);

describe("topoSort — Kahn's, deterministic", () => {
  it("orders dependencies before dependents", () => {
    const order = topoSort(thaliNodes);
    const pos = new Map(order.map((id, i) => [id, i]));
    for (const n of thaliNodes) {
      for (const dep of n.dependencies) {
        expect(pos.get(dep)!).toBeLessThan(pos.get(n.nodeId)!);
      }
    }
  });

  it("is deterministic (stable across runs)", () => {
    expect(topoSort(thaliNodes)).toEqual(topoSort(thaliNodes));
  });

  it("throws on a cycle", () => {
    expect(() =>
      topoSort([
        { nodeId: "a", dependencies: ["b"] },
        { nodeId: "b", dependencies: ["a"] },
      ]),
    ).toThrow(/cycle/);
  });
});

describe("criticalPathMethod — dependency-only CPM over the thali", () => {
  const cpm = criticalPathMethod(thaliNodes);

  it("computes the hand-checked makespan and critical path", () => {
    // Dependency-only (resources ignored at this stage): the longest chain is
    // Slit brinjals (kz_2, 7) → Fry brinjals (kz_4, 8) → Simmer (kz_5, 15) = 30 min.
    expect(cpm.makespanMins).toBe(30);
    expect(cpm.criticalPath).toEqual(["kz_2", "kz_4", "kz_5"]);
  });

  it("gives critical-path nodes zero slack and others positive slack", () => {
    for (const id of cpm.criticalPath) {
      expect(cpm.entries[id]!.slackMins).toBe(0);
    }
    // ri_1 (rinse rice) is well off the critical path → it has slack.
    expect(cpm.entries["ri_1"]!.slackMins).toBeGreaterThan(0);
  });

  it("earliest finish = earliest start + duration for every node", () => {
    for (const n of thaliNodes) {
      const e = cpm.entries[n.nodeId]!;
      expect(e.earliestFinish).toBe(e.earliestStart + n.duration.estMins);
    }
  });

  it("respects dependencies: a node never starts before any dependency finishes", () => {
    for (const n of thaliNodes) {
      for (const dep of n.dependencies) {
        expect(cpm.entries[n.nodeId]!.earliestStart).toBeGreaterThanOrEqual(
          cpm.entries[dep]!.earliestFinish,
        );
      }
    }
  });
});
