import { categoryOf, dishIdOf, toDishSummaries, toSummary, type RecipeGraph, type RecipeSummary } from "@tutti/engine";
import { filterLibrary, toLibraryEntries } from "../libraryView";
import type { CategoryCount, DishDetail, LibraryProvider, SearchParams, SearchResult } from "./types";

// Offline provider over a bundled starter set (the goldenLibrary). Same contract as the remote
// provider, computed in-memory with the engine helpers — so the app works with no network and the
// remote provider can fall back to it. Mirrors the server's dish-collapsed, faceted, paginated search.

const TIER_ORDER = { simple: 0, moderate: 1, complex: 2 } as const;

function categoryFacets(recipes: RecipeGraph[]): CategoryCount[] {
  const byCat = new Map<string, Set<string>>();
  for (const r of recipes) {
    const c = categoryOf(r);
    (byCat.get(c) ?? byCat.set(c, new Set()).get(c)!).add(dishIdOf(r));
  }
  return [...byCat.entries()]
    .map(([category, ids]) => ({ category, count: ids.size }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

export function createLocalProvider(starter: RecipeGraph[]): LibraryProvider {
  const byId = new Map(starter.map((r) => [r.recipeId, r]));
  const entries = toLibraryEntries(starter);

  function filtered(p: SearchParams): RecipeGraph[] {
    let recs = filterLibrary(entries, {
      query: p.q,
      maxMins: p.maxMins,
      diets: p.diets,
      cuisine: p.cuisine,
    }).map((e) => e.recipe);
    if (p.category) recs = recs.filter((r) => categoryOf(r) === p.category);
    return recs;
  }

  return {
    async getCategories() {
      return categoryFacets(starter).map((c) => ({ category: c.category, count: c.count }));
    },

    async searchDishes(p) {
      const recs = filtered(p);
      const dishes = toDishSummaries(recs);
      const page = Math.max(1, p.page ?? 1);
      const pageSize = Math.min(50, Math.max(1, p.pageSize ?? 20));
      const start = (page - 1) * pageSize;
      return {
        dishes: dishes.slice(start, start + pageSize),
        total: dishes.length,
        page,
        pageSize,
        facets: { categories: categoryFacets(recs).map((c) => ({ value: c.category, count: c.count })) },
      };
    },

    async getDish(dishId) {
      const variants = starter.filter((r) => dishIdOf(r) === dishId);
      if (!variants.length) return null;
      const dish = toDishSummaries(variants)[0]!;
      const summaries: RecipeSummary[] = variants
        .map(toSummary)
        .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
      return { dish, variants: summaries } satisfies DishDetail;
    },

    async getRecipe(recipeId) {
      return byId.get(recipeId) ?? null;
    },
  };
}
