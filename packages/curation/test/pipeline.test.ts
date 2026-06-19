import { describe, it, expect, vi } from "vitest";
import type { ComplexityTier, RecipeGraph } from "@tutti/engine";
import { curateCatalog } from "../src/pipeline";
import type { CatalogEntry, CurationStore, GenerateRequest, RecipeGenerator } from "../src/types";

// A minimal valid recipe the mock generator returns (the pipeline forces id/dishId/tier onto it).
function validGraph(req: GenerateRequest): RecipeGraph {
  return {
    recipeId: "x",
    name: req.name,
    version: 1,
    servings: 4,
    verified: false,
    nodes: [
      {
        nodeId: "n1",
        recipeId: "x",
        title: "Cook",
        phase: "cook",
        attention: "active",
        duration: { estMins: 10, minMins: 8, maxMins: 12, elastic: true },
        ingredients: [],
        resources: [],
        dependencies: [],
      },
    ],
  };
}

// A generator that returns an INVALID graph (dependency to a missing node) — exercises the gate.
const badGenerator: RecipeGenerator = {
  async generate(req) {
    const g = validGraph(req);
    return { ...g, nodes: [{ ...g.nodes[0]!, dependencies: ["ghost"] }] };
  },
};

function memoryStore(seedKeys: string[] = []): CurationStore & { saved: RecipeGraph[] } {
  const saved: RecipeGraph[] = [];
  return {
    saved,
    async existingKeys() { return new Set(seedKeys); },
    async upsert(r) { saved.push(r); },
  };
}

const oneDish: CatalogEntry[] = [{ dishId: "dish_x", name: "Test Biryani", category: "Biryani & Pulao", cuisine: "Test" }];

describe("curateCatalog", () => {
  it("creates a recipe per tier, forcing deterministic id/dishId/tier/verified", async () => {
    const gen: RecipeGenerator = { generate: vi.fn(async (req: GenerateRequest) => validGraph(req)) };
    const store = memoryStore();
    const report = await curateCatalog(oneDish, { generator: gen, store });

    expect(report.created).toBe(3);
    expect(report.failed).toBe(0);
    expect(store.saved.map((r) => r.recipeId).sort()).toEqual(["dish_x_complex", "dish_x_moderate", "dish_x_simple"]);
    for (const r of store.saved) {
      expect(r.dishId).toBe("dish_x");
      expect(r.verified).toBe(false);
      expect(r.category).toBe("Biryani & Pulao");
      expect(r.nodes.every((n) => n.recipeId === r.recipeId)).toBe(true);
      expect((["simple", "moderate", "complex"] as ComplexityTier[]).includes(r.tier!)).toBe(true);
    }
  });

  it("dedups against existing (dishId,tier) keys", async () => {
    const gen: RecipeGenerator = { generate: vi.fn(async (req: GenerateRequest) => validGraph(req)) };
    const store = memoryStore(["dish_x:simple", "dish_x:moderate"]);
    const report = await curateCatalog(oneDish, { generator: gen, store });

    expect(report.skipped).toBe(2);
    expect(report.created).toBe(1);
    expect(store.saved.map((r) => r.tier)).toEqual(["complex"]);
    expect((gen.generate as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1); // only the missing tier
  });

  it("rejects invalid recipes via the engine validate() gate", async () => {
    const store = memoryStore();
    const report = await curateCatalog(oneDish, { generator: badGenerator, store, maxAttempts: 2 });

    expect(report.created).toBe(0);
    expect(report.failed).toBe(3);
    expect(report.outcomes.every((o) => o.status === "invalid")).toBe(true);
    expect(store.saved.length).toBe(0);
  });

  it("dry run validates + reports but persists nothing", async () => {
    const gen: RecipeGenerator = { generate: vi.fn(async (req: GenerateRequest) => validGraph(req)) };
    const store = memoryStore();
    const report = await curateCatalog(oneDish, { generator: gen, store, dryRun: true });

    expect(report.created).toBe(3);
    expect(store.saved.length).toBe(0);
  });

  it("records the scored tier when complexityOf disagrees with the requested tier", async () => {
    // The tiny 1-node recipe scores "simple"; requesting "complex" should flag the mismatch.
    const gen: RecipeGenerator = { generate: vi.fn(async (req: GenerateRequest) => validGraph(req)) };
    const store = memoryStore();
    const report = await curateCatalog(
      [{ ...oneDish[0]!, tiers: ["complex"] as ComplexityTier[] }],
      { generator: gen, store },
    );
    const outcome = report.outcomes[0]!;
    expect(outcome.status).toBe("created");
    expect(outcome.scoredTier).toBe("simple");
  });
});
