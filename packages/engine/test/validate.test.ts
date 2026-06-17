import { describe, it, expect } from "vitest";
import { validate, isAcyclic } from "../src/index";
import type { RecipeGraph } from "../src/index";
import thali from "../fixtures/thali_v1.json" with { type: "json" };

const graphs = (thali as { recipes: RecipeGraph[] }).recipes;

describe("validate() — the offline gate (Doc 2 §3)", () => {
  it("accepts every golden thali recipe (no cycles, refs resolve, schema ok)", () => {
    for (const g of graphs) {
      const r = validate(g);
      expect(r.errors).toEqual([]);
      expect(r.ok).toBe(true);
    }
  });

  it("rejects a graph with a circular dependency", () => {
    const cyclic: RecipeGraph = {
      recipeId: "rec_x",
      name: "Cyclic",
      version: 1,
      servings: 1,
      verified: false,
      nodes: [
        { nodeId: "a", recipeId: "rec_x", title: "A", phase: "prep", attention: "active",
          duration: { estMins: 1, minMins: 1, maxMins: 1, elastic: false },
          ingredients: [], resources: [], dependencies: ["b"] },
        { nodeId: "b", recipeId: "rec_x", title: "B", phase: "prep", attention: "active",
          duration: { estMins: 1, minMins: 1, maxMins: 1, elastic: false },
          ingredients: [], resources: [], dependencies: ["a"] },
      ],
    };
    const r = validate(cyclic);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("cycle"))).toBe(true);
  });

  it("flags a dangling dependency reference", () => {
    const dangling: RecipeGraph = {
      recipeId: "rec_y", name: "Dangling", version: 1, servings: 1, verified: false,
      nodes: [
        { nodeId: "a", recipeId: "rec_y", title: "A", phase: "prep", attention: "active",
          duration: { estMins: 1, minMins: 1, maxMins: 1, elastic: false },
          ingredients: [], resources: [], dependencies: ["ghost"] },
      ],
    };
    const r = validate(dangling);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("does not resolve"))).toBe(true);
  });
});

describe("isAcyclic() — Kahn's algorithm", () => {
  it("is true for a linear chain", () => {
    expect(isAcyclic([
      { nodeId: "a", dependencies: [] },
      { nodeId: "b", dependencies: ["a"] },
      { nodeId: "c", dependencies: ["b"] },
    ])).toBe(true);
  });
  it("is false for a 2-cycle", () => {
    expect(isAcyclic([
      { nodeId: "a", dependencies: ["b"] },
      { nodeId: "b", dependencies: ["a"] },
    ])).toBe(false);
  });
});
