import type { ComplexityTier, RecipeGraph } from "@tutti/engine";

// Contracts for the AI curation pipeline. The pure pipeline (pipeline.ts) depends only on these, so
// it's fully testable with a mock generator + in-memory store — no paid AI calls, no live DB.

export interface CatalogEntry {
  /** stable dish identity, e.g. "dish_hyderabadi_chicken_biryani". */
  dishId: string;
  name: string;
  category: string;
  cuisine?: string;
  /** tiers to generate; defaults to all three. */
  tiers?: ComplexityTier[];
}

export interface GenerateRequest {
  dishId: string;
  name: string;
  category: string;
  cuisine?: string;
  tier: ComplexityTier;
}

/** Produces a RecipeGraph for a (dish, tier). Real impl calls the AI; tests pass a deterministic mock. */
export interface RecipeGenerator {
  generate(req: GenerateRequest): Promise<RecipeGraph>;
}

/** Persists curated recipes as staging (verified=false). Dedup uses existingKeys(). */
export interface CurationStore {
  /** "dishId:tier" keys already present, so we never regenerate an existing variant. */
  existingKeys(): Promise<Set<string>>;
  upsert(recipe: RecipeGraph): Promise<void>;
}

export interface CurationOutcome {
  dishId: string;
  tier: ComplexityTier;
  status: "created" | "skipped-exists" | "invalid" | "error";
  detail?: string;
  /** the tier complexityOf() actually scored, when it differs from the requested tier. */
  scoredTier?: ComplexityTier;
}

export interface CurationReport {
  outcomes: CurationOutcome[];
  created: number;
  skipped: number;
  failed: number;
}
