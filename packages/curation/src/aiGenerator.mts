// Real AI-backed RecipeGenerator. NOT run by tests/CI — this is the PAID path (provider keys in
// apps/web/.env). Reuses the server's provider router + the deterministic paste parser, exactly like
// the in-app "Ask AI" flow, so curated recipes go through the same generate→structure pipeline.

import { PasteParser } from "@tutti/ingest";
// Reaches into the web server's router so curation and the app share one provider-fallback policy.
// Single Sonnet "generate" pass — on the API there's no Claude Code overhead, so one good pass is
// already cheap. (routeRecipeStaged remains available in aiRouter for an explicit quality pipeline.)
import { routeRecipe, type Keys } from "../../../apps/web/server/aiRouter.ts";
import type { GenerateRequest, RecipeGenerator } from "./types";

function keysFromEnv(): Keys {
  return {
    openai: process.env.OPENAI_API_KEY || undefined,
    anthropic: process.env.ANTHROPIC_API_KEY || undefined,
    google: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || undefined,
  };
}

const TIER_HINT: Record<GenerateRequest["tier"], string> = {
  simple: "the quickest possible version — minimal steps & ingredients, weeknight-easy",
  moderate: "a balanced everyday version",
  complex: "an elaborate, restaurant-quality version with full technique",
};

export function createAiGenerator(keys: Keys = keysFromEnv()): RecipeGenerator {
  return {
    async generate(req: GenerateRequest) {
      const prompt =
        `Write ONE recipe for "${req.name}" (${req.category}${req.cuisine ? `, ${req.cuisine}` : ""}) — ${TIER_HINT[req.tier]}. ` +
        `Serves 4. Format strictly: a title line, then an "Ingredients:" section (one ingredient per line with quantity), ` +
        `then a "Method:" section with numbered steps. No commentary.`;
      const ai = await routeRecipe(prompt, keys, "generate"); // single Sonnet-tier pass
      const result = await new PasteParser().parse({ source: "paste", text: ai.text });
      if (!result.graph) throw new Error(`parse failed: ${result.validation.errors.join("; ")}`);
      return result.graph;
    },
  };
}
