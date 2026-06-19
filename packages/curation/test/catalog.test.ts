import { describe, it, expect, vi } from "vitest";
import { CATEGORIES, type RecipeGraph } from "@tutti/engine";
import { SEED_CATALOG } from "../src/catalog";
import { planCuration } from "../src/plan";
import { curateCatalog } from "../src/pipeline";
import type { CurationStore, GenerateRequest, RecipeGenerator } from "../src/types";

function validGraph(req: GenerateRequest): RecipeGraph {
  return {
    recipeId: "x", name: req.name, version: 1, servings: 4, verified: false,
    nodes: [{ nodeId: "n1", recipeId: "x", title: "Cook", phase: "cook", attention: "active",
      duration: { estMins: 10, minMins: 8, maxMins: 12, elastic: true }, ingredients: [], resources: [], dependencies: [] }],
  };
}
function memoryStore(): CurationStore & { saved: RecipeGraph[] } {
  const saved: RecipeGraph[] = [];
  return { saved, async existingKeys() { return new Set(); }, async upsert(r) { saved.push(r); } };
}

describe("SEED_CATALOG integrity", () => {
  it("is a substantial catalog", () => {
    expect(SEED_CATALOG.length).toBeGreaterThanOrEqual(150);
  });

  it("every entry uses a category from the engine vocabulary", () => {
    const vocab = new Set(CATEGORIES as readonly string[]);
    const bad = SEED_CATALOG.filter((e) => !vocab.has(e.category));
    expect(bad.map((e) => `${e.dishId}:${e.category}`)).toEqual([]);
  });

  it("has unique dishIds and non-empty names/cuisines", () => {
    const ids = SEED_CATALOG.map((e) => e.dishId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SEED_CATALOG.every((e) => e.name.trim() && e.dishId.startsWith("dish_"))).toBe(true);
    expect(SEED_CATALOG.every((e) => (e.cuisine ?? "").trim().length > 0)).toBe(true);
  });

  it("covers the four target cuisines and the Biryani & Pulao category", () => {
    const cuisines = new Set(SEED_CATALOG.map((e) => e.cuisine));
    for (const c of ["Italian", "Mediterranean", "Mexican"]) expect(cuisines.has(c)).toBe(true);
    expect([...cuisines].some((c) => /Indian/.test(c ?? ""))).toBe(true);
    expect(SEED_CATALOG.filter((e) => e.category === "Biryani & Pulao").length).toBeGreaterThanOrEqual(25);
  });
});

describe("planCuration", () => {
  it("counts dishes × 3 tiers with an empty store", () => {
    const plan = planCuration(SEED_CATALOG);
    expect(plan.totalDishes).toBe(SEED_CATALOG.length);
    expect(plan.totalRecipes).toBe(SEED_CATALOG.length * 3);
    expect(plan.alreadyHave).toBe(0);
    expect(plan.byCategory.reduce((s, r) => s + r.dishes, 0)).toBe(SEED_CATALOG.length);
  });

  it("subtracts (dish,tier) pairs already in the store", () => {
    const first = SEED_CATALOG[0]!;
    const plan = planCuration(SEED_CATALOG, new Set([`${first.dishId}:simple`, `${first.dishId}:moderate`]));
    expect(plan.alreadyHave).toBe(2);
    expect(plan.totalRecipes).toBe(SEED_CATALOG.length * 3 - 2);
  });
});

describe("full catalog flows through the pipeline (mock generator, no AI)", () => {
  it("produces 3 valid recipes per dish with no failures", async () => {
    const gen: RecipeGenerator = { generate: vi.fn(async (req: GenerateRequest) => validGraph(req)) };
    const store = memoryStore();
    const report = await curateCatalog(SEED_CATALOG, { generator: gen, store });
    expect(report.failed).toBe(0);
    expect(report.created).toBe(SEED_CATALOG.length * 3);
    expect(store.saved.length).toBe(SEED_CATALOG.length * 3);
    // Each saved recipe's dishId came from the catalog and its id is dishId_tier.
    expect(store.saved.every((r) => /_(simple|moderate|complex)$/.test(r.recipeId))).toBe(true);
  });
});
