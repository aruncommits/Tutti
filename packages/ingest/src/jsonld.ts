// schema.org Recipe extraction from HTML JSON-LD (Brief v3 item 1). Most recipe sites embed a
// <script type="application/ld+json"> Recipe object — extracting that is deterministic, key-free,
// and legally safer than scraping prose. Pure: no network (the fetch is a separate concern).

import { validate, type RecipeGraph, type ValidationResult } from "@tutti/engine";
import { buildDraftGraph } from "./draft";

interface JsonLdRecipe {
  name?: string;
  recipeIngredient?: string[];
  recipeInstructions?: unknown;
}

const slug = (s: string) => "rec_" + (s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "recipe");

/** Find every JSON-LD object (handles arrays and @graph) and return the first @type Recipe. */
function findRecipe(html: string): JsonLdRecipe | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const candidates: unknown[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1]!.trim());
      candidates.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      /* skip malformed block */
    }
  }
  const isRecipe = (o: unknown): o is JsonLdRecipe => {
    const t = (o as { "@type"?: unknown })?.["@type"];
    return Array.isArray(t) ? t.includes("Recipe") : t === "Recipe";
  };
  for (const c of candidates) {
    if (isRecipe(c)) return c as JsonLdRecipe;
    const graph = (c as { "@graph"?: unknown[] })?.["@graph"];
    if (Array.isArray(graph)) { const r = graph.find(isRecipe); if (r) return r as JsonLdRecipe; }
  }
  return null;
}

/** Normalize recipeInstructions (string | {text} | HowToStep[] | HowToSection) to step strings. */
function instructionStrings(instr: unknown): string[] {
  if (!instr) return [];
  if (typeof instr === "string") return instr.split(/\n+|\.\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(instr)) {
    return instr.flatMap((step) => {
      if (typeof step === "string") return [step.trim()];
      const s = step as { text?: string; name?: string; itemListElement?: unknown };
      if (s.itemListElement) return instructionStrings(s.itemListElement); // HowToSection
      return [(s.text || s.name || "").trim()];
    }).filter(Boolean);
  }
  return [];
}

export interface JsonLdResult {
  graph: RecipeGraph | null;
  validation: ValidationResult;
  found: boolean;
}

/** Extract a draft RecipeGraph from a page's JSON-LD. found=false when no Recipe is present. */
export function extractJsonLdRecipe(html: string): JsonLdResult {
  const recipe = findRecipe(html);
  if (!recipe) {
    return { graph: null, found: false, validation: { ok: false, errors: ["no schema.org Recipe JSON-LD found"], warnings: [] } };
  }
  const name = recipe.name ?? "Imported recipe";
  const ingredients = (recipe.recipeIngredient ?? []).map(String);
  const steps = instructionStrings(recipe.recipeInstructions);
  const graph = buildDraftGraph(slug(name), name, ingredients, steps);
  const validation = validate(graph);
  return { graph: validation.ok ? graph : graph, found: true, validation };
}
