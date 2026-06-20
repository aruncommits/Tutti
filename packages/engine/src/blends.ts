// Compound ingredients: spice blends ("garam masala", "biryani masala", "sambar powder"…) are
// themselves small recipes. By default a recipe lists the blend as one (store-bought) line; this
// registry lets the app reveal a "make at home" breakdown — the constituent spices + a short method.
//
// A blend is a STANDARD JAR you make once and store, so the breakdown is a fixed home batch (not
// scaled to the dish's needed amount). Constituent names reuse the ingredient reference where possible
// so they cost/aisle correctly. Hand-authored — no AI; unknown blends simply stay a single line.

import type { Ingredient, RecipeGraph } from "./types";
import { normalizeIngredientName } from "./shopping";

export interface BlendDef {
  constituents: Ingredient[];
  /** human description of the home batch this makes, e.g. "about 1/2 cup". */
  yields: string;
  method: string;
}

const ing = (name: string, amount?: number, unit?: string): Ingredient => ({ name, amount, unit });
const ROAST = "Dry-roast the whole spices on low heat until fragrant, cool, then grind to a fine powder. Store airtight.";
const STIR = "Stir everything together until evenly mixed. Store airtight — no roasting needed.";

// Keyed by normalized name; aliases (e.g. "biryani powder") share a definition.
export const KNOWN_BLENDS: Record<string, BlendDef> = {
  "garam masala": {
    constituents: [
      ing("coriander seeds", 3, "tbsp"), ing("cumin seeds", 2, "tbsp"), ing("black pepper", 1, "tbsp"),
      ing("cardamom", 1, "tbsp"), ing("cinnamon", 2, "inch"), ing("clove", 1, "tsp"),
      ing("bay leaf", 2, "whole"), ing("nutmeg", 0.25, "whole"),
    ],
    yields: "about 1/2 cup", method: ROAST,
  },
  "biryani masala": {
    constituents: [
      ing("coriander seeds", 3, "tbsp"), ing("cumin seeds", 1, "tbsp"), ing("fennel seeds", 1, "tbsp"),
      ing("black pepper", 1, "tbsp"), ing("cardamom", 1, "tbsp"), ing("cinnamon", 2, "inch"),
      ing("clove", 1, "tsp"), ing("bay leaf", 2, "whole"), ing("star anise", 1, "whole"),
      ing("mace", 1, "tsp"), ing("dried red chili", 4, "whole"),
    ],
    yields: "about 1/2 cup", method: ROAST,
  },
  "sambar powder": {
    constituents: [
      ing("coriander seeds", 4, "tbsp"), ing("chana dal", 2, "tbsp"), ing("toor dal", 1, "tbsp"),
      ing("dried red chili", 8, "whole"), ing("fenugreek seeds", 1, "tsp"), ing("black pepper", 1, "tsp"),
      ing("curry leaves", 2, "sprig"), ing("turmeric", 1, "tsp"),
    ],
    yields: "about 1/2 cup", method: ROAST,
  },
  "rasam powder": {
    constituents: [
      ing("coriander seeds", 3, "tbsp"), ing("cumin seeds", 1, "tbsp"), ing("toor dal", 2, "tbsp"),
      ing("black pepper", 1, "tbsp"), ing("dried red chili", 6, "whole"), ing("curry leaves", 1, "sprig"),
    ],
    yields: "about 1/3 cup", method: ROAST,
  },
  "chaat masala": {
    constituents: [
      ing("cumin seeds", 2, "tbsp"), ing("black pepper", 1, "tsp"), ing("amchur", 2, "tbsp"),
      ing("black salt", 1, "tbsp"), ing("asafoetida", 0.25, "tsp"), ing("dry ginger", 1, "tsp"),
    ],
    yields: "about 1/3 cup", method: ROAST,
  },
  "curry powder": {
    constituents: [
      ing("coriander seeds", 3, "tbsp"), ing("cumin seeds", 2, "tbsp"), ing("turmeric", 1, "tbsp"),
      ing("fenugreek seeds", 1, "tsp"), ing("black pepper", 1, "tsp"), ing("dried red chili", 3, "whole"),
      ing("mustard seeds", 1, "tsp"),
    ],
    yields: "about 1/2 cup", method: ROAST,
  },
  "pav bhaji masala": {
    constituents: [
      ing("coriander seeds", 3, "tbsp"), ing("cumin seeds", 1, "tbsp"), ing("red chili powder", 2, "tbsp"),
      ing("black pepper", 1, "tsp"), ing("cinnamon", 1, "inch"), ing("clove", 0.5, "tsp"),
      ing("amchur", 1, "tbsp"), ing("fennel seeds", 1, "tsp"),
    ],
    yields: "about 1/2 cup", method: ROAST,
  },
  "tandoori masala": {
    constituents: [
      ing("coriander seeds", 2, "tbsp"), ing("cumin seeds", 2, "tbsp"), ing("paprika", 2, "tbsp"),
      ing("black pepper", 1, "tsp"), ing("cardamom", 1, "tsp"), ing("clove", 0.5, "tsp"),
      ing("dry ginger", 1, "tsp"), ing("garlic powder", 1, "tsp"),
    ],
    yields: "about 1/2 cup", method: ROAST,
  },
  "chana masala": {
    constituents: [
      ing("coriander seeds", 3, "tbsp"), ing("cumin seeds", 2, "tbsp"), ing("dried red chili", 4, "whole"),
      ing("black pepper", 1, "tsp"), ing("cardamom", 1, "tsp"), ing("cinnamon", 1, "inch"),
      ing("clove", 0.5, "tsp"), ing("bay leaf", 1, "whole"), ing("amchur", 1, "tbsp"),
    ],
    yields: "about 1/2 cup", method: ROAST,
  },
  "fried rice seasoning": {
    constituents: [
      ing("white pepper", 1, "tbsp"), ing("garlic powder", 1, "tbsp"), ing("onion powder", 1, "tbsp"),
      ing("dry ginger", 1, "tsp"), ing("sugar", 1, "tsp"), ing("salt", 1, "tsp"),
    ],
    yields: "about 1/4 cup", method: STIR,
  },
  "taco seasoning": {
    constituents: [
      ing("chili powder", 2, "tbsp"), ing("cumin", 1, "tbsp"), ing("paprika", 1, "tbsp"),
      ing("garlic powder", 1, "tsp"), ing("onion powder", 1, "tsp"), ing("oregano", 1, "tsp"),
      ing("black pepper", 0.5, "tsp"), ing("salt", 1, "tsp"),
    ],
    yields: "about 1/3 cup", method: STIR,
  },
  "fajita seasoning": {
    constituents: [
      ing("chili powder", 1, "tbsp"), ing("paprika", 1, "tbsp"), ing("cumin", 1, "tbsp"),
      ing("garlic powder", 1, "tsp"), ing("onion powder", 1, "tsp"), ing("oregano", 1, "tsp"), ing("salt", 1, "tsp"),
    ],
    yields: "about 1/4 cup", method: STIR,
  },
  "italian seasoning": {
    constituents: [
      ing("oregano", 2, "tbsp"), ing("basil", 2, "tbsp"), ing("thyme", 1, "tbsp"),
      ing("rosemary", 1, "tbsp"),
    ],
    yields: "about 1/3 cup", method: STIR,
  },
  "cajun seasoning": {
    constituents: [
      ing("paprika", 2, "tbsp"), ing("garlic powder", 1, "tbsp"), ing("onion powder", 1, "tbsp"),
      ing("black pepper", 1, "tsp"), ing("red chili powder", 1, "tsp"), ing("oregano", 1, "tsp"),
      ing("thyme", 1, "tsp"), ing("salt", 1, "tsp"),
    ],
    yields: "about 1/2 cup", method: STIR,
  },
};

// Aliases pointing at the same definition.
const ALIASES: Record<string, string> = {
  "biryani powder": "biryani masala",
  "fried rice powder": "fried rice seasoning",
  "chole masala": "chana masala",
  "tandoori powder": "tandoori masala",
};

/** Resolve a (possibly messy) ingredient name to a blend definition, or null. */
export function getBlend(name: string): BlendDef | null {
  const norm = normalizeIngredientName(name);
  const key = ALIASES[norm] ?? norm;
  if (KNOWN_BLENDS[key]) return KNOWN_BLENDS[key]!;
  // tolerate qualifiers ("homemade garam masala", "biryani masala powder")
  for (const k of Object.keys(KNOWN_BLENDS)) if (norm.includes(k)) return KNOWN_BLENDS[k]!;
  for (const [a, k] of Object.entries(ALIASES)) if (norm.includes(a)) return KNOWN_BLENDS[k]!;
  return null;
}

export const isBlend = (name: string): boolean => getBlend(name) !== null;

/** The make-at-home breakdown for a blend (a standard jar batch), or null if not a known blend. */
export function expandBlend(name: string): BlendDef | null {
  return getBlend(name);
}

/** A copy of the recipe with blend ingredient lines (matching `which`) replaced by their constituents.
 *  Non-destructive; used to fold "make from scratch" blends into the shopping list / mise gather list. */
export function expandBlendsInRecipe(recipe: RecipeGraph, which: (name: string) => boolean = isBlend): RecipeGraph {
  let touched = false;
  const nodes = recipe.nodes.map((n) => {
    let changed = false;
    const ingredients: Ingredient[] = [];
    for (const i of n.ingredients) {
      const blend = which(i.name) ? getBlend(i.name) : null;
      if (blend) {
        ingredients.push(...blend.constituents);
        changed = true;
      } else ingredients.push(i);
    }
    if (changed) touched = true;
    return changed ? { ...n, ingredients } : n;
  });
  return touched ? { ...recipe, nodes } : recipe;
}
