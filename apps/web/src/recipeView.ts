import { topoSort, buildShoppingList, type RecipeGraph, type TaskNode } from "@tutti/engine";

// Pure read-view helpers for the recipe detail page (Brief v19). No DOM, no scheduling — just
// "show me this recipe": its steps in a sensible order and its aggregated ingredients.

export interface DetailIngredient {
  name: string;
  amount?: number;
  unit?: string;
  toTaste?: boolean;
}

/** Steps in dependency order (a step always follows the steps it depends on). */
export function orderedSteps(recipe: RecipeGraph): TaskNode[] {
  const byId = new Map(recipe.nodes.map((n) => [n.nodeId, n]));
  return topoSort(recipe.nodes).map((id) => byId.get(id)!);
}

/** De-duplicated ingredient list for one recipe (reuses the engine's shopping consolidation). */
export function recipeIngredients(recipe: RecipeGraph): DetailIngredient[] {
  return buildShoppingList([recipe]).map((i) => ({
    name: i.name,
    amount: i.amount,
    unit: i.unit,
    toTaste: i.amount === undefined,
  }));
}

export function recipeTotalMins(recipe: RecipeGraph): number {
  return recipe.nodes.reduce((s, n) => s + n.duration.estMins, 0);
}
