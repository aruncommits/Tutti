import { describe, it, expect } from "vitest";
import { goldenLibrary, validate, compile, type RecipeGraph } from "../src/index";

describe("goldenLibrary — seeded verified recipes (Brief v8 item 1, Doc 8/9)", () => {
  it("ships several recipes", () => {
    expect(goldenLibrary.length).toBeGreaterThanOrEqual(6);
  });

  it("every entry is valid, verified, and non-empty", () => {
    for (const r of goldenLibrary) {
      const v = validate(r);
      expect(v.errors, `${r.name} should validate`).toEqual([]);
      expect(v.ok).toBe(true);
      expect(r.verified).toBe(true);
      expect(r.nodes.length).toBeGreaterThan(0);
    }
  });

  it("recipeIds are unique and every node belongs to its recipe", () => {
    const ids = new Set<string>();
    for (const r of goldenLibrary) {
      expect(ids.has(r.recipeId)).toBe(false);
      ids.add(r.recipeId);
      for (const n of r.nodes) expect(n.recipeId).toBe(r.recipeId);
    }
  });

  it("each recipe compiles into a feasible plan on a default kitchen", () => {
    const kitchen = { cooks: 1, resources: [
      { category: "burner", count: 2 }, { category: "pan", count: 2, capabilities: ["small", "large"] },
      { category: "pressure_cooker", count: 1 }, { category: "cutting_board", count: 1 }, { category: "blender", count: 1 },
    ] };
    for (const r of goldenLibrary as RecipeGraph[]) {
      const plan = compile([r], kitchen, "19:30:00");
      expect(plan.nodes.length).toBe(r.nodes.length);
      expect(plan.criticalPathMins).toBeGreaterThan(0);
    }
  });
});
