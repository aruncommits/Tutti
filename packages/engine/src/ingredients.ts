// Ingredient reference: nutrition (per 100g), unit→grams conversion, store aisle, and diet flags.
// Pure, data-driven, offline. Values are home-cooking approximations (see fixtures/ingredients.json).

import data from "../fixtures/ingredients.json";
import { normalizeIngredientName } from "./shopping";

export interface IngredientInfo {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  /** g per millilitre, for volume→grams. */
  density?: number;
  /** g for a single count unit (whole, clove, sprig…). */
  gPerPiece?: number;
  aisle: string;
  /** animal, meat, fish, shellfish, dairy, egg, gluten, honey, nut, peanut, sesame, soy, allium. */
  flags: string[];
}

const ITEMS = (data as { items: Record<string, IngredientInfo> }).items;

// Millilitres per volume unit; grams per weight unit; everything else is a count unit.
const ML_PER_UNIT: Record<string, number> = {
  ml: 1, milliliter: 1, millilitre: 1, cc: 1,
  l: 1000, liter: 1000, litre: 1000,
  cup: 240, cups: 240,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  pinch: 0.3,
};
const G_PER_UNIT: Record<string, number> = {
  g: 1, gram: 1, grams: 1, gm: 1,
  kg: 1000, kilogram: 1000,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6,
};
const DEFAULT_PIECE_G = 50; // rough fallback for a countable item with no known weight

/** Look up an ingredient by (normalized) name, with progressive fallback to a contained keyword. */
export function lookupIngredient(name: string): IngredientInfo | null {
  const norm = normalizeIngredientName(name);
  if (ITEMS[norm]) return ITEMS[norm]!;
  // try dropping qualifier words right-to-left ("roasted chana dal" → "chana dal" → "dal")
  const words = norm.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const tail = words.slice(i).join(" ");
    if (ITEMS[tail]) return ITEMS[tail]!;
  }
  // last resort: any key fully contained in the name (longest key wins)
  let best: IngredientInfo | null = null;
  let bestLen = 0;
  for (const key of Object.keys(ITEMS)) {
    if (key.length > bestLen && (norm.includes(key) || key.includes(norm))) {
      best = ITEMS[key]!;
      bestLen = key.length;
    }
  }
  return best;
}

/** Convert an amount+unit of a named ingredient to grams. Returns null when not determinable. */
export function gramsOf(amount: number | undefined, unit: string | undefined, name: string): number | null {
  if (amount === undefined || amount === null || !isFinite(amount)) return null;
  const u = (unit ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (u in G_PER_UNIT) return amount * G_PER_UNIT[u]!;
  const info = lookupIngredient(name);
  if (u in ML_PER_UNIT) return amount * ML_PER_UNIT[u]! * (info?.density ?? 1);
  // count units (whole, clove, sprig, can, slice, …) or unitless
  if (!u || /^(whole|piece|pieces|pc|clove|cloves|sprig|sprigs|stick|sticks|leaf|leaves|slice|slices|can|cans|bunch|handful|inch|lime-size|small|medium|large|head)$/.test(u)) {
    return amount * (info?.gPerPiece ?? DEFAULT_PIECE_G);
  }
  // unknown unit but we have a per-piece weight → treat as pieces; else give up
  return info?.gPerPiece ? amount * info.gPerPiece : null;
}

export const ALL_INGREDIENTS = ITEMS;
