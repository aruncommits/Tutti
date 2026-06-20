import { describe, it, expect } from "vitest";
import { isBlend, expandBlend, expandBlendsInRecipe } from "../src/blends";
import { aisleOf } from "../src/aisle";
import type { Ingredient, RecipeGraph, TaskNode } from "../src/types";

describe("blend registry", () => {
  it("recognizes known blends (incl. aliases + qualifiers), rejects plain ingredients", () => {
    expect(isBlend("garam masala")).toBe(true);
    expect(isBlend("biryani masala")).toBe(true);
    expect(isBlend("Biryani Powder")).toBe(true); // alias
    expect(isBlend("homemade sambar powder")).toBe(true); // qualifier tolerated
    expect(isBlend("taco seasoning")).toBe(true);
    expect(isBlend("chicken")).toBe(false);
    expect(isBlend("basmati rice")).toBe(false);
  });

  it("expands a blend into constituent spices + a method", () => {
    const b = expandBlend("biryani masala")!;
    expect(b).not.toBeNull();
    expect(b.constituents.length).toBeGreaterThan(4);
    expect(b.constituents.every((c) => typeof c.name === "string")).toBe(true);
    expect(b.method).toMatch(/grind|stir|roast/i);
    expect(b.yields).toMatch(/cup/);
    // constituents resolve to real ingredients (so they cost + aisle correctly)
    expect(b.constituents.some((c) => /coriander|cumin/.test(c.name))).toBe(true);
    expect(aisleOf(b.constituents[0]!.name)).toBe("Spices");
  });

  it("returns null for an unknown blend", () => {
    expect(expandBlend("chicken")).toBeNull();
  });
});

describe("expandBlendsInRecipe", () => {
  const ing = (name: string, amount?: number, unit?: string): Ingredient => ({ name, amount, unit });
  const node = (ingredients: Ingredient[]): TaskNode => ({
    nodeId: "r_1", recipeId: "r", title: "t", instruction: "t", phase: "prep", attention: "active",
    duration: { estMins: 5, minMins: 3, maxMins: 7, elastic: false }, ingredients, resources: [], dependencies: [],
  });
  const recipe = (): RecipeGraph => ({
    recipeId: "r", name: "Biryani", version: 1, servings: 4, verified: true,
    nodes: [node([ing("chicken", 500, "g"), ing("biryani masala", 2, "tbsp"), ing("salt")])],
  });

  it("replaces only matching blend lines with their constituents; leaves others intact", () => {
    const out = expandBlendsInRecipe(recipe());
    const names = out.nodes[0]!.ingredients.map((i) => i.name);
    expect(names).toContain("chicken"); // non-blend untouched
    expect(names).toContain("salt");
    expect(names).not.toContain("biryani masala"); // blend replaced
    expect(names.some((n) => /coriander|cumin/.test(n))).toBe(true); // by its spices
  });

  it("is a no-op (same reference) when nothing matches", () => {
    const r = recipe();
    const out = expandBlendsInRecipe(r, () => false);
    expect(out).toBe(r);
  });
});
