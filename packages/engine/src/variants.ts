// Group recipes that are variants of the same dish (simple/moderate/complex), electing a trusted
// default. Keeps the "one verified default, alternates clearly marked" hierarchy that protects the
// curated library: AI/customized variants never displace a verified one.

import type { ComplexityTier, RecipeGraph } from "./types";
import { complexityOf } from "./complexity";

const TIER_ORDER: Record<ComplexityTier, number> = { simple: 0, moderate: 1, complex: 2 };

/** A recipe's dish key — its own id unless it explicitly belongs to a variant group. */
export const dishIdOf = (r: RecipeGraph): string => r.dishId ?? r.recipeId;

/** Authored tier wins; otherwise derive from the graph. */
export const tierOf = (r: RecipeGraph): ComplexityTier => r.tier ?? complexityOf(r).tier;

export interface DishGroup {
  dishId: string;
  /** the dish name (from the elected default). */
  name: string;
  /** verified default if one exists, else the first member — what discovery shows on the card. */
  defaultRecipe: RecipeGraph;
  /** every member, ordered simple → moderate → complex. */
  variants: RecipeGraph[];
  /** true when any member is unverified (AI/customized) — surfaces the badge. */
  hasUnverified: boolean;
}

const byTier = (a: RecipeGraph, b: RecipeGraph) => TIER_ORDER[tierOf(a)] - TIER_ORDER[tierOf(b)];

/** Elect the default member: a verified moderate, else any verified, else the moderate/first. */
function electDefault(variants: RecipeGraph[]): RecipeGraph {
  return (
    variants.find((r) => r.verified && tierOf(r) === "moderate") ??
    variants.find((r) => r.verified) ??
    variants.find((r) => tierOf(r) === "moderate") ??
    variants[0]!
  );
}

/** Group recipes by dishId, preserving input order of first appearance for stable display. */
export function groupVariants(recipes: RecipeGraph[]): DishGroup[] {
  const groups = new Map<string, RecipeGraph[]>();
  for (const r of recipes) {
    const id = dishIdOf(r);
    (groups.get(id) ?? groups.set(id, []).get(id)!).push(r);
  }
  return [...groups.entries()].map(([dishId, members]) => {
    const variants = [...members].sort(byTier);
    const defaultRecipe = electDefault(variants);
    return {
      dishId,
      name: defaultRecipe.name,
      defaultRecipe,
      variants,
      hasUnverified: variants.some((r) => !r.verified),
    };
  });
}

/** All variants of a given dish, ordered simple → moderate → complex. */
export function variantsForDish(recipes: RecipeGraph[], dishId: string): RecipeGraph[] {
  return recipes.filter((r) => dishIdOf(r) === dishId).sort(byTier);
}
