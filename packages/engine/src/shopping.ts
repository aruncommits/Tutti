// Consolidated shopping list (Doc 6; Brief v4 item 3). Aggregates every ingredient across the
// chosen recipes into one list — summed by normalized name + unit, with which dishes need each.
// Pure data work (P1). Light normalization strips leading prep adjectives so "chopped beans" and
// "beans" merge; it is deliberately conservative (no risky stemming).

import type { RecipeGraph } from "./types";

export interface ShoppingItem {
  name: string;
  unit?: string;
  amount?: number; // summed; undefined when every occurrence was "to taste"
  toTaste: boolean;
  recipeIds: string[];
}

const ADJ = new Set([
  "chopped", "sliced", "diced", "grated", "peeled", "slit", "rinsed", "cooked", "minced",
  "ground", "fresh", "dried", "finely", "roughly", "raw", "warm", "hot", "cold", "whole",
]);

/** lowercase, drop a trailing ", note", strip leading prep adjectives → a merge key fragment. */
export function normalizeIngredientName(name: string): string {
  const words = name.toLowerCase().trim().split(",")[0]!.trim().split(/\s+/);
  while (words.length > 1 && ADJ.has(words[0]!)) words.shift();
  return words.join(" ");
}

export function buildShoppingList(recipes: RecipeGraph[]): ShoppingItem[] {
  const order: string[] = [];
  const map = new Map<string, ShoppingItem>();

  for (const r of recipes) {
    for (const node of r.nodes) {
      for (const ing of node.ingredients) {
        const name = normalizeIngredientName(ing.name);
        const unit = ing.unit ?? "";
        const key = `${name}|${unit}`;
        let item = map.get(key);
        if (!item) {
          item = { name, unit: ing.unit, amount: undefined, toTaste: false, recipeIds: [] };
          map.set(key, item);
          order.push(key);
        }
        if (!item.recipeIds.includes(r.recipeId)) item.recipeIds.push(r.recipeId);
        if (ing.amount === undefined) item.toTaste = true;
        else item.amount = Math.round(((item.amount ?? 0) + ing.amount) * 100) / 100;
      }
    }
  }

  return order.map((k) => map.get(k)!);
}
