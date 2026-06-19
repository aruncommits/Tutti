import type { ComplexityTier } from "@tutti/engine";
import type { CatalogEntry } from "./types";

// Pure, free (no AI, no writes) planner: enumerate dish × tier minus what's already in the store, and
// aggregate counts. Powers the `npm run curate` dry run so we see exactly what would be generated.

const ALL_TIERS: ComplexityTier[] = ["simple", "moderate", "complex"];

export interface CurationPlan {
  totalDishes: number;
  totalRecipes: number; // net new recipes to generate (after dedup against existing)
  alreadyHave: number; // (dish,tier) pairs already present
  byCategory: { category: string; dishes: number; recipes: number }[];
  byCuisine: { cuisine: string; dishes: number; recipes: number }[];
}

export function planCuration(catalog: CatalogEntry[], existingKeys: Set<string> = new Set()): CurationPlan {
  const byCat = new Map<string, { dishes: number; recipes: number }>();
  const byCui = new Map<string, { dishes: number; recipes: number }>();
  const bump = (m: Map<string, { dishes: number; recipes: number }>, key: string, recipes: number) => {
    const v = m.get(key) ?? { dishes: 0, recipes: 0 };
    v.dishes += 1;
    v.recipes += recipes;
    m.set(key, v);
  };

  let totalRecipes = 0;
  let alreadyHave = 0;
  for (const e of catalog) {
    const tiers = e.tiers ?? ALL_TIERS;
    const toGenerate = tiers.filter((t) => !existingKeys.has(`${e.dishId}:${t}`)).length;
    alreadyHave += tiers.length - toGenerate;
    totalRecipes += toGenerate;
    bump(byCat, e.category, toGenerate);
    bump(byCui, e.cuisine ?? "—", toGenerate);
  }

  const rows = (m: Map<string, { dishes: number; recipes: number }>, label: "category" | "cuisine") =>
    [...m.entries()]
      .sort((a, b) => b[1].dishes - a[1].dishes || a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ [label]: k, dishes: v.dishes, recipes: v.recipes }) as { category: string; cuisine: string; dishes: number; recipes: number });

  return {
    totalDishes: catalog.length,
    totalRecipes,
    alreadyHave,
    byCategory: rows(byCat, "category"),
    byCuisine: rows(byCui, "cuisine"),
  };
}
