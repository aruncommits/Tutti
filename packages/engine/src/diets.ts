// Which diets a recipe satisfies, derived from its ingredients' flags (or authored on the recipe).
// Pure & offline. Derivation is optimistic for unknown ingredients — authored `diets` is ground truth.

import type { RecipeGraph } from "./types";
import { lookupIngredient } from "./ingredients";

export const DIETS = [
  "vegetarian",
  "vegan",
  "pescatarian",
  "gluten-free",
  "dairy-free",
  "egg-free",
  "nut-free",
  "peanut-free",
] as const;
export type Diet = (typeof DIETS)[number];

/** Collect the union of ingredient flags across a recipe. */
function flagsOf(recipe: RecipeGraph): Set<string> {
  const flags = new Set<string>();
  for (const node of recipe.nodes) {
    for (const ing of node.ingredients) {
      const info = lookupIngredient(ing.name);
      if (info) for (const f of info.flags) flags.add(f);
    }
  }
  return flags;
}

/** Diets this recipe satisfies. Honors authored `recipe.diets`; otherwise derives from ingredients. */
export function dietsOf(recipe: RecipeGraph): Diet[] {
  if (recipe.diets && recipe.diets.length) {
    return DIETS.filter((d) => recipe.diets!.includes(d));
  }
  const f = flagsOf(recipe);
  const out: Diet[] = [];
  const noMeat = !f.has("meat");
  const noFlesh = noMeat && !f.has("fish") && !f.has("shellfish");
  if (noFlesh) out.push("vegetarian");
  if (noFlesh && !f.has("animal") && !f.has("dairy") && !f.has("egg") && !f.has("honey")) out.push("vegan");
  if (noMeat) out.push("pescatarian"); // allows fish/shellfish, excludes land-animal meat
  if (!f.has("gluten")) out.push("gluten-free");
  if (!f.has("dairy")) out.push("dairy-free");
  if (!f.has("egg")) out.push("egg-free");
  if (!f.has("nut")) out.push("nut-free");
  if (!f.has("peanut")) out.push("peanut-free");
  return out;
}

/** True when a recipe satisfies every diet the user requires. */
export function satisfiesDiets(recipe: RecipeGraph, required: string[]): boolean {
  if (!required.length) return true;
  const has = new Set(dietsOf(recipe));
  return required.every((d) => has.has(d as Diet));
}
