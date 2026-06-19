// Per-serving nutrition for a recipe (and a whole meal), estimated from its ingredients when not
// authored. Pure & offline; uses the curated ingredient table. Estimates flag their own confidence.

import type { Nutrition, RecipeGraph } from "./types";
import { gramsOf, lookupIngredient } from "./ingredients";

export interface NutritionEstimate extends Nutrition {
  /** true when derived from ingredients (vs authored on the recipe). */
  estimated: boolean;
  /** fraction of ingredient lines (with an amount) we could weigh & price — 0..1. */
  coverage: number;
}

const EMPTY: Nutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };

const r1 = (n: number) => Math.round(n * 10) / 10;
const round = (n: Nutrition): Nutrition => ({
  kcal: Math.round(n.kcal), protein: r1(n.protein), carbs: r1(n.carbs), fat: r1(n.fat),
  fiber: r1(n.fiber ?? 0), sugar: r1(n.sugar ?? 0), sodium: Math.round(n.sodium ?? 0),
});

const add = (a: Nutrition, b: Nutrition): Nutrition => ({
  kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat,
  fiber: (a.fiber ?? 0) + (b.fiber ?? 0), sugar: (a.sugar ?? 0) + (b.sugar ?? 0), sodium: (a.sodium ?? 0) + (b.sodium ?? 0),
});

/** Per-serving nutrition. Authored `recipe.nutrition` wins; otherwise estimate from ingredients. */
export function nutritionOf(recipe: RecipeGraph): NutritionEstimate {
  if (recipe.nutrition) return { ...EMPTY, ...recipe.nutrition, estimated: false, coverage: 1 };

  let total = { ...EMPTY };
  let lines = 0;
  let weighed = 0;
  for (const node of recipe.nodes) {
    for (const ing of node.ingredients) {
      if (ing.amount === undefined && ing.grams === undefined) continue; // "salt to taste" etc.
      lines++;
      const grams = ing.grams ?? gramsOf(ing.amount, ing.unit, ing.name);
      const info = lookupIngredient(ing.name);
      if (grams === null || !info) continue;
      weighed++;
      const f = grams / 100;
      total = add(total, {
        kcal: info.kcal * f, protein: info.protein * f, carbs: info.carbs * f, fat: info.fat * f,
        fiber: (info.fiber ?? 0) * f, sugar: (info.sugar ?? 0) * f, sodium: (info.sodium ?? 0) * f,
      });
    }
  }
  const servings = Math.max(1, recipe.servings || 1);
  const per: Nutrition = {
    kcal: total.kcal / servings, protein: total.protein / servings, carbs: total.carbs / servings,
    fat: total.fat / servings, fiber: (total.fiber ?? 0) / servings, sugar: (total.sugar ?? 0) / servings,
    sodium: (total.sodium ?? 0) / servings,
  };
  return { ...round(per), estimated: true, coverage: lines === 0 ? 0 : weighed / lines };
}

/** Per-person nutrition for a whole meal = sum of each dish's per-serving (scaling keeps per-serving
 *  constant). Coverage is the worst dish's coverage; estimated if any dish is estimated. */
export function mealNutrition(recipes: RecipeGraph[]): NutritionEstimate {
  let sum = { ...EMPTY };
  let estimated = false;
  let coverage = 1;
  for (const r of recipes) {
    const n = nutritionOf(r);
    sum = add(sum, n);
    estimated = estimated || n.estimated;
    coverage = Math.min(coverage, n.coverage);
  }
  return { ...round(sum), estimated, coverage };
}
