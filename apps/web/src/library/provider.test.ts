import { describe, it, expect, vi } from "vitest";
import { goldenLibrary, type RecipeGraph } from "@tutti/engine";
import { memoryRecipeStore } from "./recipeStore";
import { createLocalProvider } from "./localProvider";
import { createRemoteProvider } from "./remoteProvider";

const starter = goldenLibrary as RecipeGraph[];

describe("memoryRecipeStore", () => {
  it("puts and gets recipes", async () => {
    const s = memoryRecipeStore();
    await s.put(starter[0]!);
    expect((await s.get(starter[0]!.recipeId))?.recipeId).toBe(starter[0]!.recipeId);
    expect(await s.get("missing")).toBeUndefined();
    await s.putMany(starter.slice(1, 4));
    expect((await s.getMany(starter.slice(0, 4).map((r) => r.recipeId))).length).toBe(4);
    expect((await s.all()).length).toBe(4);
  });
});

describe("local provider (offline starter)", () => {
  const lp = createLocalProvider(starter);

  it("lists categories with dish counts", async () => {
    const cats = await lp.getCategories();
    expect(cats.length).toBeGreaterThan(0);
    expect(cats.every((c) => c.count > 0)).toBe(true);
    // sorted by count desc
    expect(cats).toEqual([...cats].sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)));
  });

  it("searches dish-collapsed with pagination + facets", async () => {
    const r = await lp.searchDishes({ q: "rice", pageSize: 2, page: 1 });
    expect(r.dishes.length).toBeLessThanOrEqual(2);
    expect(r.total).toBeGreaterThanOrEqual(r.dishes.length);
    expect(r.facets.categories.length).toBeGreaterThan(0);
    // page 2 differs from page 1 when there are >2 matches
    if (r.total > 2) {
      const r2 = await lp.searchDishes({ q: "rice", pageSize: 2, page: 2 });
      expect(r2.dishes[0]?.dishId).not.toBe(r.dishes[0]?.dishId);
    }
  });

  it("filters by category and maxMins", async () => {
    const r = await lp.searchDishes({ category: "Rice", maxMins: 60, pageSize: 50 });
    expect(r.dishes.every((d) => d.category === "Rice")).toBe(true);
  });

  it("getDish returns ordered tier variants; getRecipe returns the full graph", async () => {
    const cats = await lp.searchDishes({ pageSize: 1 });
    const dishId = cats.dishes[0]!.dishId;
    const detail = await lp.getDish(dishId);
    expect(detail).not.toBeNull();
    const tiers = detail!.variants.map((v) => v.tier);
    const order = { simple: 0, moderate: 1, complex: 2 } as const;
    expect(tiers).toEqual([...tiers].sort((a, b) => order[a] - order[b]));
    const full = await lp.getRecipe(detail!.dish.defaultRecipeId);
    expect(full?.nodes.length).toBeGreaterThan(0);
    expect(await lp.getDish("nope")).toBeNull();
  });
});

describe("remote provider", () => {
  const sample = starter[0]!;

  it("fetches search from the API and parses it", async () => {
    const payload = { dishes: [], total: 0, page: 1, pageSize: 20, facets: { categories: [] } };
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    const p = createRemoteProvider({ fetchFn: fetchFn as unknown as typeof fetch, store: memoryRecipeStore(), starter });
    const r = await p.searchDishes({ q: "x" });
    expect(r).toEqual(payload);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("falls back to the offline starter when the network fails", async () => {
    const fetchFn = vi.fn(async () => { throw new Error("offline"); });
    const p = createRemoteProvider({ fetchFn: fetchFn as unknown as typeof fetch, store: memoryRecipeStore(), starter });
    const r = await p.searchDishes({ q: "rice" });
    expect(r.dishes.length).toBeGreaterThan(0); // came from the local fallback
  });

  it("caches a fetched recipe, then serves it from the store without a second fetch", async () => {
    const store = memoryRecipeStore();
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 }));
    const p = createRemoteProvider({ fetchFn: fetchFn as unknown as typeof fetch, store, starter });
    const first = await p.getRecipe(sample.recipeId);
    expect(first?.recipeId).toBe(sample.recipeId);
    expect(await store.get(sample.recipeId)).toBeTruthy(); // cached for offline cook
    const second = await p.getRecipe(sample.recipeId);
    expect(second?.recipeId).toBe(sample.recipeId);
    expect(fetchFn).toHaveBeenCalledOnce(); // served from cache the 2nd time
  });

  it("falls back to the starter graph for getRecipe when offline and uncached", async () => {
    const fetchFn = vi.fn(async () => { throw new Error("offline"); });
    const p = createRemoteProvider({ fetchFn: fetchFn as unknown as typeof fetch, store: memoryRecipeStore(), starter });
    const r = await p.getRecipe(sample.recipeId);
    expect(r?.recipeId).toBe(sample.recipeId);
  });
});
