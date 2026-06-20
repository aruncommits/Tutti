import { describe, it, expect } from "vitest";
import { inferServings, compileRecipe } from "../src/serving";
import type { Ingredient, RecipeGraph, TaskNode } from "../src/types";

// Build a one-node graph with the given ingredients (weights in grams keep the test data-independent).
function graph(servings: number, ingredients: Ingredient[], category?: string): RecipeGraph {
  const node: TaskNode = {
    nodeId: "r_1",
    recipeId: "r",
    title: "step",
    instruction: "do the thing",
    phase: "prep",
    attention: "active",
    duration: { estMins: 5, minMins: 3, maxMins: 7, elastic: false },
    ingredients,
    resources: [],
    dependencies: [],
  };
  return { recipeId: "r", name: "Test", version: 1, servings, verified: true, category, nodes: [node] };
}
const g = (name: string, amount?: number, unit?: string): Ingredient => ({ name, amount, unit });

describe("inferServings", () => {
  it("estimates a biryani at ~4 from its weights (spices/water excluded)", () => {
    const r = graph(2, [
      g("chicken", 700, "g"),
      g("basmati rice", 350, "g"),
      g("yogurt", 250, "g"),
      g("onions", 300, "g"),
      g("salt"), // to taste — ignored
      g("cloves", 5), // spice — excluded (would be 250g at the piece default)
      g("cumin powder", 2, "tsp"), // spice — excluded
      g("water", 500, "g"), // water — excluded
    ], "Biryani & Pulao");
    expect(inferServings(r)).toBe(4);
  });

  it("estimates a small dessert at ~2", () => {
    expect(inferServings(graph(2, [g("milk", 200, "g"), g("flour", 80, "g")], "Desserts"))).toBe(2);
  });

  it("estimates a big-batch curry at 6+", () => {
    const r = graph(2, [
      g("paneer", 800, "g"), g("tomato", 500, "g"), g("cream", 300, "g"), g("onions", 400, "g"),
    ], "Curries & Gravies");
    expect(inferServings(r)).toBeGreaterThanOrEqual(6);
  });

  it("returns null (low confidence) when too few ingredients carry weight", () => {
    expect(inferServings(graph(2, [g("onion", 100, "g"), g("salt"), g("pepper")], "Curries & Gravies"))).toBeNull();
  });
});

describe("compileRecipe", () => {
  const biryani = () => graph(2, [
    g("chicken", 700, "g"), g("basmati rice", 350, "g"), g("yogurt", 250, "g"), g("onions", 300, "g"),
  ], "Biryani & Pulao");

  it("overrides a wrong base servings from the ingredients (backfill path)", () => {
    const out = compileRecipe(biryani(), { preferStated: false });
    expect(out.servings).toBe(4);
    expect(out.servingsSource).toBe("inferred");
  });

  it("keeps a plausible stated servings when preferStated", () => {
    const r = { ...biryani(), servings: 4 };
    const out = compileRecipe(r, { preferStated: true });
    expect(out.servings).toBe(4);
    expect(out.servingsSource).toBe("stated");
  });

  it("overrides an implausible stated servings even when preferStated", () => {
    const r = { ...biryani(), servings: 20 }; // 20 is outside [0.5x, 2x] of inferred 4
    expect(compileRecipe(r, { preferStated: true }).servings).toBe(4);
  });

  it("applies the catalog name", () => {
    expect(compileRecipe(biryani(), { name: "Ambur Chicken Biryani" }).name).toBe("Ambur Chicken Biryani");
  });

  it("is non-destructive: nodes (ingredients, timings, deps) are unchanged", () => {
    const r = biryani();
    const out = compileRecipe(r, { name: "X", preferStated: false });
    expect(out.nodes).toEqual(r.nodes); // ratios, amounts, durations, dependencies untouched
  });

  it("keeps current servings when inference is low-confidence", () => {
    const r = graph(3, [g("onion", 100, "g"), g("salt")], "Curries & Gravies");
    expect(compileRecipe(r, { preferStated: false }).servings).toBe(3);
  });
});
