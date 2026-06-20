import { PasteParser } from "@tutti/ingest";
import type { ComplexityTier, RecipeGraph } from "@tutti/engine";

// Pure parsing for a batched 3-tier recipe response (no Node deps) — split into per-tier sections,
// strip any preamble, and parse each to a RecipeGraph. Kept separate from the CLI generator so it's
// typecheckable + unit-testable without the Node-only `claude` spawn.

export const TIERS: ComplexityTier[] = ["simple", "moderate", "complex"];

/** Drop preamble before the recipe: keep from the TOP of the contiguous header block (title / Serves
 *  / Best for) just above "Ingredients:" — never truncate into it. */
export function strip(text: string): string {
  const lines = text.replace(/```/g, "").split("\n");
  const ing = lines.findIndex((l) => /^\s*ingredients:?\s*$/i.test(l));
  if (ing <= 0) return text.replace(/```/g, "").trim();
  let top = ing;
  while (top > 0 && lines[top - 1]!.trim() !== "") top--;
  return lines.slice(top).join("\n").trim();
}

/** Split a batched response into per-tier recipe text by the "=== TIER: x ===" delimiters. */
export function splitTiers(text: string): Partial<Record<ComplexityTier, string>> {
  const re = /=+\s*TIER:\s*(simple|moderate|complex)\s*=+/gi;
  const matches = [...text.matchAll(re)];
  const out: Partial<Record<ComplexityTier, string>> = {};
  for (let i = 0; i < matches.length; i++) {
    const tier = matches[i]![1]!.toLowerCase() as ComplexityTier;
    const start = matches[i]!.index! + matches[i]![0]!.length;
    const end = i + 1 < matches.length ? matches[i + 1]!.index! : text.length;
    out[tier] = text.slice(start, end).trim();
  }
  return out;
}

/** Parse one recipe section to a RecipeGraph (null if unusable). */
export async function toGraph(text: string): Promise<RecipeGraph | null> {
  const r = await new PasteParser().parse({ source: "paste", text: strip(text) });
  return r.graph;
}

/** Parse a batched 3-tier response into per-tier RecipeGraphs (pure — no model call). */
export async function parseBatch(raw: string): Promise<Map<ComplexityTier, RecipeGraph>> {
  const sections = splitTiers(raw);
  const map = new Map<ComplexityTier, RecipeGraph>();
  for (const tier of TIERS) {
    const sec = sections[tier];
    if (!sec) continue;
    const g = await toGraph(sec);
    if (g) map.set(tier, g);
  }
  return map;
}
