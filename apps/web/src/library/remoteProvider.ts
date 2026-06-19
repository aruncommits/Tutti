import type { RecipeGraph } from "@tutti/engine";
import type { CategoryCount, DishDetail, LibraryProvider, SearchParams, SearchResult } from "./types";
import { createLocalProvider } from "./localProvider";
import type { RecipeStore } from "./recipeStore";

// Remote provider: reads the server catalog (/api/library/*) and caches full RecipeGraphs on-device
// (RecipeStore → IndexedDB). Network failures fall back to the bundled offline provider so the app
// keeps working; getRecipe checks the cache first, so anything already added cooks offline.

export interface RemoteProviderOptions {
  baseUrl?: string; // default "" → same-origin (Vite proxies /api/library/* to the API)
  fetchFn?: typeof fetch;
  store: RecipeStore;
  starter: RecipeGraph[]; // bundled offline fallback (the goldenLibrary)
}

function qs(p: SearchParams): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.category) sp.set("category", p.category);
  if (p.cuisine) sp.set("cuisine", p.cuisine);
  if (p.maxMins !== undefined) sp.set("maxMins", String(p.maxMins));
  for (const d of p.diets ?? []) sp.append("diet", d);
  if (p.page !== undefined) sp.set("page", String(p.page));
  if (p.pageSize !== undefined) sp.set("pageSize", String(p.pageSize));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function createRemoteProvider(opts: RemoteProviderOptions): LibraryProvider {
  const base = opts.baseUrl ?? "";
  const doFetch = opts.fetchFn ?? fetch;
  const local = createLocalProvider(opts.starter);

  async function getJson<T>(path: string): Promise<T> {
    const res = await doFetch(`${base}/api/library${path}`);
    if (!res.ok) throw new Error(`library ${path} → ${res.status}`);
    return (await res.json()) as T;
  }

  return {
    async getCategories(): Promise<CategoryCount[]> {
      try {
        return await getJson<CategoryCount[]>("/categories");
      } catch {
        return local.getCategories();
      }
    },

    async searchDishes(params: SearchParams): Promise<SearchResult> {
      try {
        return await getJson<SearchResult>(`/search${qs(params)}`);
      } catch {
        return local.searchDishes(params);
      }
    },

    async getDish(dishId: string): Promise<DishDetail | null> {
      try {
        return await getJson<DishDetail>(`/dish/${encodeURIComponent(dishId)}`);
      } catch {
        return local.getDish(dishId);
      }
    },

    async getRecipe(recipeId: string): Promise<RecipeGraph | null> {
      // Cache first — this is what makes an added recipe cookable offline.
      const cached = await opts.store.get(recipeId);
      if (cached) return cached;
      try {
        const recipe = await getJson<RecipeGraph>(`/recipe/${encodeURIComponent(recipeId)}`);
        await opts.store.put(recipe);
        return recipe;
      } catch {
        return local.getRecipe(recipeId);
      }
    },
  };
}
