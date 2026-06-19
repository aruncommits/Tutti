import { goldenLibrary, thaliV1, type RecipeGraph } from "@tutti/engine";
import { idbRecipeStore } from "./recipeStore";
import { createRemoteProvider } from "./remoteProvider";

// Configured library singletons for the app. The STARTER set (bundled goldenLibrary + thali demo) is
// the offline fallback AND seeds the same catalog the server holds; recipeStore caches full graphs in
// IndexedDB so anything added cooks offline. `library` reads the server catalog with that cache + the
// starter as fallback. Everything else in the app talks to `library`/`recipeStore` — never a hardcoded list.

export const STARTER: RecipeGraph[] = (() => {
  const map = new Map<string, RecipeGraph>();
  for (const r of [...goldenLibrary, ...thaliV1.recipes]) map.set(r.recipeId, r);
  return [...map.values()];
})();

export const recipeStore = idbRecipeStore();

export const library = createRemoteProvider({ store: recipeStore, starter: STARTER });

export type { LibraryProvider, SearchParams, SearchResult, CategoryCount, FacetCount, DishDetail } from "./types";
