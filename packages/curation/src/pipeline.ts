import { complexityOf, validate, type ComplexityTier, type RecipeGraph } from "@tutti/engine";
import type {
  CatalogEntry,
  CurationOutcome,
  CurationReport,
  CurationStore,
  GenerateRequest,
  RecipeGenerator,
} from "./types";

// Pure curation pipeline: for each (dish, tier) → generate → force the catalog identity → engine
// validate() gate → complexityOf() tier check → dedup by (dishId,tier) → persist as staging. No I/O
// of its own; the generator + store are injected, so this is deterministic and unit-testable.

export interface CurateOptions {
  generator: RecipeGenerator;
  store: CurationStore;
  /** retries when a generated recipe fails validation. */
  maxAttempts?: number;
  /** validate + report but don't persist. */
  dryRun?: boolean;
  /** regenerate even when a (dishId,tier) already exists (upgrade/overwrite). */
  force?: boolean;
  log?: (msg: string) => void;
}

const ALL_TIERS: ComplexityTier[] = ["simple", "moderate", "complex"];
const keyOf = (dishId: string, tier: ComplexityTier) => `${dishId}:${tier}`;

/** Force the catalog's identity onto a generated graph so dedup + dish grouping are deterministic. */
function normalize(graph: RecipeGraph, req: GenerateRequest): RecipeGraph {
  const recipeId = `${req.dishId}_${req.tier}`;
  // servings is already resolved at parse time (PasteParser → draftFromText: stated, else inferred),
  // so here we only force the catalog identity + authoritative name.
  return {
    ...graph,
    recipeId,
    dishId: req.dishId,
    name: req.name, // the catalog is authoritative for the dish name — never the AI's parsed title
    category: req.category,
    cuisine: req.cuisine ?? graph.cuisine,
    tier: req.tier,
    verified: false, // curated recipes enter staging unverified; a separate publish step promotes them
    nodes: graph.nodes.map((n) => ({ ...n, recipeId })),
  };
}

export async function curateCatalog(entries: CatalogEntry[], opts: CurateOptions): Promise<CurationReport> {
  const log = opts.log ?? (() => {});
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 2);
  const seen = new Set(opts.force ? [] : await opts.store.existingKeys());
  const outcomes: CurationOutcome[] = [];

  for (const entry of entries) {
    for (const tier of entry.tiers ?? ALL_TIERS) {
      const key = keyOf(entry.dishId, tier);
      if (seen.has(key)) {
        outcomes.push({ dishId: entry.dishId, tier, status: "skipped-exists" });
        continue;
      }
      const req: GenerateRequest = {
        dishId: entry.dishId,
        name: entry.name,
        category: entry.category,
        cuisine: entry.cuisine,
        tier,
      };

      let placed = false;
      let lastErr = "";
      for (let attempt = 1; attempt <= maxAttempts && !placed; attempt++) {
        try {
          const graph = normalize(await opts.generator.generate(req), req);
          const v = validate(graph);
          if (!v.ok) { lastErr = v.errors.join("; "); continue; }
          const scored = complexityOf(graph).tier;
          if (!opts.dryRun) await opts.store.upsert(graph);
          seen.add(key);
          placed = true;
          outcomes.push({ dishId: entry.dishId, tier, status: "created", scoredTier: scored !== tier ? scored : undefined });
          log(`${graph.recipeId} ✓${scored !== tier ? ` (scored ${scored})` : ""}`);
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e);
        }
      }
      if (!placed) {
        const status = lastErr.includes("dependency") || lastErr.includes("cycle") || lastErr.includes("phase") ? "invalid" : "error";
        outcomes.push({ dishId: entry.dishId, tier, status, detail: lastErr });
        log(`${entry.dishId}_${tier} ✗ ${status}: ${lastErr}`);
      }
    }
  }

  return {
    outcomes,
    created: outcomes.filter((o) => o.status === "created").length,
    skipped: outcomes.filter((o) => o.status === "skipped-exists").length,
    failed: outcomes.filter((o) => o.status === "invalid" || o.status === "error").length,
  };
}
