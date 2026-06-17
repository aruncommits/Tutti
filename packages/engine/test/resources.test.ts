import { describe, it, expect } from "vitest";
import { HANDS, normalizeKitchen, nodeRequirements, capacityOf, thaliV1 } from "../src/index";
import type { TaskNode } from "../src/index";

const kitchen = thaliV1.kitchenProfile;
const nodes: TaskNode[] = thaliV1.recipes.flatMap((r) => r.nodes);
const byId = new Map(nodes.map((n) => [n.nodeId, n]));

describe("normalizeKitchen — hands as a resource (Doc 2 §4.2)", () => {
  it("adds a hands pool whose count equals the number of cooks", () => {
    const k = normalizeKitchen(kitchen); // thali kitchen has cooks: 1
    expect(capacityOf(k, HANDS)).toBe(1);
  });

  it("does not duplicate a hands pool if normalized twice", () => {
    const k = normalizeKitchen(normalizeKitchen({ ...kitchen, cooks: 2 }));
    expect(k.resources.filter((r) => r.category === HANDS).length).toBe(1);
    expect(capacityOf(k, HANDS)).toBe(2);
  });

  it("preserves existing equipment capacity (2 burners in the thali kitchen)", () => {
    const k = normalizeKitchen(kitchen);
    expect(capacityOf(k, "burner")).toBe(2);
  });
});

describe("nodeRequirements — active needs hands, passive does not", () => {
  it("an active task requires one hands unit", () => {
    const req = nodeRequirements(byId.get("kz_4")!); // Fry brinjals — active
    expect(req.some((r) => r.category === HANDS && r.count === 1)).toBe(true);
  });

  it("a passive task holds no hands", () => {
    const req = nodeRequirements(byId.get("kz_5")!); // Simmer — passive
    expect(req.some((r) => r.category === HANDS)).toBe(false);
    // but it still holds its burner + pan
    expect(req.some((r) => r.category === "burner")).toBe(true);
  });

  it("never double-counts hands even if a node already declared one", () => {
    const weird: TaskNode = {
      ...byId.get("kz_4")!,
      resources: [...byId.get("kz_4")!.resources, { category: HANDS, count: 1 }],
    };
    const req = nodeRequirements(weird);
    expect(req.filter((r) => r.category === HANDS).length).toBe(1);
  });
});

describe("capacityOf — Level 0 counts and Level 2 instances", () => {
  it("sums typed instances as capacity", () => {
    const k = {
      cooks: 1,
      resources: [{ category: "pot", instances: [{ id: "a", capabilities: [] }, { id: "b", capabilities: [] }] }],
    };
    expect(capacityOf(k, "pot")).toBe(2);
  });
});
