import type { RecipeGraph } from "@tutti/engine";

// On-device cache of full RecipeGraphs. Recipes are bigger/more numerous than localStorage suits, so
// the remote provider persists them in IndexedDB — this is also what makes a server-sourced recipe
// cookable OFFLINE once added to a meal. Behind a tiny interface so providers/tests can swap in an
// in-memory store without IndexedDB.

export interface RecipeStore {
  get(id: string): Promise<RecipeGraph | undefined>;
  getMany(ids: string[]): Promise<RecipeGraph[]>;
  put(recipe: RecipeGraph): Promise<void>;
  putMany(recipes: RecipeGraph[]): Promise<void>;
  all(): Promise<RecipeGraph[]>;
}

/** In-memory store — for tests, SSR, and as a fallback when IndexedDB is unavailable. */
export function memoryRecipeStore(seed: RecipeGraph[] = []): RecipeStore {
  const map = new Map<string, RecipeGraph>(seed.map((r) => [r.recipeId, r]));
  return {
    async get(id) { return map.get(id); },
    async getMany(ids) { return ids.map((id) => map.get(id)).filter((r): r is RecipeGraph => !!r); },
    async put(recipe) { map.set(recipe.recipeId, recipe); },
    async putMany(recipes) { for (const r of recipes) map.set(r.recipeId, r); },
    async all() { return [...map.values()]; },
  };
}

// Minimal promise wrapper over IndexedDB (no dependency). Keyed by recipeId.
function openDb(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: "recipeId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(db: IDBDatabase, storeName: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const req = fn(t.objectStore(storeName));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB-backed store. Falls back to an in-memory store when IndexedDB isn't available. */
export function idbRecipeStore(dbName = "tutti-library", storeName = "recipes"): RecipeStore {
  if (typeof indexedDB === "undefined") return memoryRecipeStore();
  let dbp: Promise<IDBDatabase> | null = null;
  const db = () => (dbp ??= openDb(dbName, storeName));
  return {
    async get(id) { return tx<RecipeGraph | undefined>(await db(), storeName, "readonly", (s) => s.get(id)); },
    async getMany(ids) {
      const d = await db();
      const out = await Promise.all(ids.map((id) => tx<RecipeGraph | undefined>(d, storeName, "readonly", (s) => s.get(id))));
      return out.filter((r): r is RecipeGraph => !!r);
    },
    async put(recipe) { await tx(await db(), storeName, "readwrite", (s) => s.put(recipe)); },
    async putMany(recipes) { const d = await db(); await Promise.all(recipes.map((r) => tx(d, storeName, "readwrite", (s) => s.put(r)))); },
    async all() { return tx<RecipeGraph[]>(await db(), storeName, "readonly", (s) => s.getAll()); },
  };
}
