import { describe, it, expect } from "vitest";
import { goldenLibrary, nutritionOf, mealNutrition, gramsOf, lookupIngredient } from "../src/index";
import type { RecipeGraph } from "../src/index";

const byId = (id: string) => goldenLibrary.find((r) => r.recipeId === id)!;

describe("gramsOf", () => {
  it("converts weight units directly", () => {
    expect(gramsOf(2, "kg", "rice")).toBe(2000);
    expect(gramsOf(1, "oz", "rice")).toBeCloseTo(28.35, 1);
  });
  it("converts volume units via ingredient density", () => {
    // 1 cup water = 240ml × 1.0 g/ml
    expect(gramsOf(1, "cup", "water")).toBeCloseTo(240, 0);
    // 1 cup rice = 240ml × 0.85
    expect(gramsOf(1, "cup", "rice")).toBeCloseTo(204, 0);
  });
  it("converts count units via per-piece weight", () => {
    expect(gramsOf(3, "whole", "tomato")).toBeCloseTo(360, 0); // 120g each
    expect(gramsOf(2, "clove", "garlic")).toBeCloseTo(6, 0); // 3g each
  });
  it("returns null when amount is missing", () => {
    expect(gramsOf(undefined, "tsp", "salt")).toBeNull();
  });
});

describe("lookupIngredient", () => {
  it("resolves a normalized name and a qualified variant", () => {
    expect(lookupIngredient("rice")?.aisle).toBe("Grains & rice");
    expect(lookupIngredient("roasted chana dal")?.aisle).toBe("Lentils & beans"); // drops 'roasted'
  });
  it("returns null for an unknown ingredient", () => {
    expect(lookupIngredient("moon dust")).toBeNull();
  });
});

describe("nutritionOf", () => {
  it("estimates positive, sane per-serving nutrition for a golden dish", () => {
    const n = nutritionOf(byId("rec_lemonrice"));
    expect(n.estimated).toBe(true);
    expect(n.kcal).toBeGreaterThan(80);
    expect(n.kcal).toBeLessThan(900);
    expect(n.coverage).toBeGreaterThan(0.5);
    expect(n.protein).toBeGreaterThanOrEqual(0);
  });

  it("uses authored nutrition exactly when present", () => {
    const base = byId("rec_chutney");
    const authored: RecipeGraph = { ...base, nutrition: { kcal: 123, protein: 4, carbs: 5, fat: 9 } };
    const n = nutritionOf(authored);
    expect(n.estimated).toBe(false);
    expect(n.coverage).toBe(1);
    expect(n.kcal).toBe(123);
  });

  it("every golden recipe estimates without throwing", () => {
    for (const r of goldenLibrary) {
      const n = nutritionOf(r);
      expect(n.kcal).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(n.kcal)).toBe(true);
    }
  });
});

describe("mealNutrition", () => {
  it("sums per-serving nutrition across dishes", () => {
    const a = nutritionOf(byId("rec_lemonrice"));
    const b = nutritionOf(byId("rec_sambar"));
    const meal = mealNutrition([byId("rec_lemonrice"), byId("rec_sambar")]);
    expect(meal.kcal).toBe(Math.round(a.kcal + b.kcal));
    expect(meal.estimated).toBe(true);
  });
});
