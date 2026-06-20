// Recipe "compiler": derive a base serving size from what a recipe actually contains, and normalize
// its name + servings WITHOUT touching its content. The app scales per-person from `servings`, so a
// wrong base (e.g. a parser that dropped "Serves: N") mis-scales everything — this recovers a
// consistent base from the ingredient weights.
//
// NON-DESTRUCTIVE BY CONSTRUCTION: only `name`, `servings`, and `servingsSource` change; the `nodes`
// (ingredient amounts/units/ratios, step text, durations/timings, dependencies) are passed through
// untouched, and it never calls scaleRecipe. So ratios, timings, and ingredients cannot drift.

import { categoryOf, type Category } from "./categories";
import type { RecipeGraph } from "./types";
import { gramsOf } from "./ingredients";

// Grams of edible food per person, by category — calibrated so (food weight ÷ norm) ≈ the batch's
// natural serving count. Liquid-heavy categories run higher. Tunable; covered by tests.
export const SERVINGS_NORM: Record<Category, number> = {
  "Biryani & Pulao": 400,
  Rice: 350,
  "Pasta & Noodles": 300,
  "Curries & Gravies": 320,
  "Dal & Lentils": 320,
  "Soups & Stews": 450,
  Breads: 110,
  "Breakfast & Tiffin": 250,
  "Sides & Stir-fries": 200,
  Salads: 180,
  "Snacks & Starters": 150,
  Pizza: 300,
  "Tacos & Wraps": 250,
  "Grills & Kebabs": 230,
  Mains: 340,
  "Chutneys & Sauces": 70,
  Desserts: 140,
  Drinks: 300,
  Other: 300,
};

// Excluded from the serving estimate: water/ice (mass without portions) and seasonings/spices/
// aromatics (tiny real weight, but count-unit defaults would wildly inflate the sum — e.g. "5 cloves"
// → 250g at the 50g piece default). Servings is driven by the substantial components.
const SKIP =
  /\b(water|ice|salt|pepper|peppercorns?|chil[il]|chilli|chillies|spice|masala|cumin|coriander|turmeric|paprika|cayenne|cardamom|cloves?|cinnamon|bay\s*lea(f|ves)|star\s*anise|mace|nutmeg|fenugreek|mustard\s*seeds?|asafo?etida|hing|saffron|garam|powder|ginger.?garlic|baking\s*(powder|soda)|yeast|vanilla|essence|food\s*colou?r|to taste)\b/i;

/** Estimate base servings from ingredient weights. `null` = low confidence (caller keeps current). */
export function inferServings(graph: RecipeGraph, category?: Category): number | null {
  const norm = SERVINGS_NORM[category ?? categoryOf(graph)] ?? 300;
  let foodGrams = 0;
  let weighed = 0;
  for (const node of graph.nodes) {
    for (const ing of node.ingredients) {
      if (ing.amount === undefined && ing.grams === undefined) continue; // "to taste"
      if (SKIP.test(ing.name)) continue;
      const g = ing.grams ?? gramsOf(ing.amount, ing.unit, ing.name);
      if (g === null || g <= 0) continue;
      foodGrams += g;
      weighed++;
    }
  }
  if (weighed < 2 || foodGrams < 100) return null; // not enough signal to trust
  const est = Math.round(foodGrams / norm);
  // Outside the plausible home-recipe band, the mass heuristic is unreliable (water-heavy drinks/
  // soups under-count; dry grains/lentils that expand under-count; a stray big quantity over-counts) —
  // report low confidence so the caller can fall back to a sane default rather than show "1" or "40".
  if (est < 2 || est > 12) return null;
  return est;
}

const isPlausible = (stated: number, inferred: number) => stated >= inferred * 0.5 && stated <= inferred * 2;

export interface CompileOptions {
  category?: Category;
  /** override the name (e.g. the authoritative catalog name). */
  name?: string;
  /** keep a plausible stated `servings` instead of the inferred one (trust good source data). */
  preferStated?: boolean;
}

/** Normalize a recipe's name + base serving size from its contents. Content is left untouched. */
export function compileRecipe(graph: RecipeGraph, opts: CompileOptions = {}): RecipeGraph {
  const inferred = inferServings(graph, opts.category);
  let servings = graph.servings;
  let servingsSource = graph.servingsSource;
  if (inferred !== null) {
    if (opts.preferStated && graph.servings && isPlausible(graph.servings, inferred)) {
      servings = graph.servings;
      servingsSource = "stated";
    } else {
      servings = inferred;
      servingsSource = "inferred";
    }
  }
  return { ...graph, name: opts.name ?? graph.name, servings, servingsSource };
}
