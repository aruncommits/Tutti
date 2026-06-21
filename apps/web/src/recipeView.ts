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

/** An ingredient as a single editable line ("500 g chicken", "salt to taste") — round-trips through
 *  the paste parser's parseIngredient. */
export function formatIngredientLine(i: { name: string; amount?: number; unit?: string }): string {
  if (i.amount === undefined) return i.name;
  return `${i.amount}${i.unit ? ` ${i.unit}` : ""} ${i.name}`.trim();
}

/** Every ingredient line of a recipe (across all nodes, in order) for the editor. */
export function editableIngredientLines(recipe: RecipeGraph): string[] {
  return recipe.nodes.flatMap((n) => n.ingredients).map(formatIngredientLine);
}

/** Every step's text, in cook order, for the editor. */
export function editableStepLines(recipe: RecipeGraph): string[] {
  return orderedSteps(recipe).map((n) => n.instruction ?? n.title);
}

/** Re-assemble edited fields into canonical recipe text the PasteParser understands (used by the
 *  customize editor so a save round-trips through the normal parse + compile pipeline). */
export function assembleRecipeText(name: string, servings: number, ingredientLines: string[], stepLines: string[]): string {
  return (
    `${name.trim()}\nServes: ${Math.max(1, Math.round(servings))}\n\n` +
    `Ingredients:\n${ingredientLines.map((l) => `- ${l}`).join("\n")}\n\n` +
    `Method:\n${stepLines.map((l, i) => `${i + 1}. ${l}`).join("\n")}`
  );
}
