// Shared "draft RecipeGraph" builder (Doc 5). Turns a name + ingredient strings + instruction
// strings into a candidate graph with conservative, SAFE defaults: linear step dependencies (never
// invents parallelism that the physics may not allow — Doc 5 rule 4), ambiguous attention => active
// (P3 fail-safe), heat/rest keywords => cook/passive. A human or the AiParser refines from here.

import type { Ingredient, Phase, RecipeGraph, TaskNode } from "@tutti/engine";

const PASSIVE = /\b(simmer|bake|boil|roast|rest|chill|marinate|refrigerate|cool|proof|rise|set aside|steep|soak)\b/i;
const COOK = /\b(cook|bake|fry|saut|boil|simmer|roast|grill|heat|temper|toast|steam|sear|braise|caramel)\b/i;
const SERVE = /\b(serve|plate|garnish|sprinkle over|drizzle over|enjoy)\b/i;
const ELASTIC = /\b(chop|dice|slice|mince|knead|grate|peel|cut|whisk|beat|fold|mix|stir together)\b/i;

// Unicode vulgar fractions → decimals, so "2½ cups" and "½ tsp" parse like "2.5"/"0.5".
const FRAC: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625,
  "⅞": 0.875, "⅙": 1 / 6, "⅚": 5 / 6, "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
};
const FCLASS = "¼½¾⅓⅔⅛⅜⅝⅞⅙⅚⅕⅖⅗⅘";
// A quantity token: mixed "1 1/2", fraction "1/2", decimal/int with optional trailing unicode frac
// ("2½"), or a bare unicode fraction ("½").
const QTY = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?[${FCLASS}]?|[${FCLASS}])`;

/** Turn an isolated quantity token into a number (handles fractions, mixed, and unicode). */
function parseQty(q: string): number | undefined {
  const t = q.trim();
  const uf = t.match(new RegExp(`^(\\d+)?\\s*([${FCLASS}])$`));
  if (uf) return (uf[1] ? Number(uf[1]) : 0) + FRAC[uf[2]!]!;
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : undefined;
  if (/^\d+(?:\.\d+)?$/.test(t)) return Number(t);
  return undefined;
}

/** Split "cups flour" → {unit:"cups", name:"flour"}; "flour" → {name:"flour"}. */
function unitName(rest: string): { unit?: string; name: string } {
  const m = rest.match(/^([a-zA-Z]+)\.?\s+(.*)$/);
  return m && m[2]!.trim() ? { unit: m[1], name: m[2]!.trim() } : { name: rest.trim() };
}

/** Loosely parse "1 1/2 cups flour", "2-3 cups flour", "about 2½ cups flour" → {amount,unit,name}.
 *  Falls back to the raw string when there's no leading quantity. */
export function parseIngredient(raw: string): Ingredient {
  const s = raw.trim().replace(/^(?:(?:about|around|approx\.?|approximately|roughly)\s+|~\s*)/i, "");
  // ranges: "2-3 cups flour", "2 to 3 cups flour" → midpoint
  const range = s.match(new RegExp(`^(${QTY})\\s*(?:-|–|—|to)\\s*(${QTY})\\s+(.*)$`, "i"));
  if (range && range[3]) {
    const a = parseQty(range[1]!);
    const b = parseQty(range[2]!);
    if (a !== undefined && b !== undefined) return { amount: (a + b) / 2, ...unitName(range[3]!) };
  }
  const m = s.match(new RegExp(`^(${QTY})\\s*([a-zA-Z]+)?\\s+(.*)$`));
  if (m && m[3]) return { name: m[3]!.trim(), amount: parseQty(m[1]!), unit: m[2] };
  return { name: s };
}

/** Pull "for 20 minutes" / "1 hour" out of an instruction; else a phase-based default. */
function estMins(text: string, phase: Phase): number {
  const mh = text.match(/(\d+(?:\.\d+)?)\s*(hour|hr)/i);
  if (mh) return Math.round(parseFloat(mh[1]!) * 60);
  const mm = text.match(/(\d+)\s*(min|minute)/i);
  if (mm) return parseInt(mm[1]!, 10);
  return phase === "prep" ? 5 : phase === "serve" ? 2 : 12;
}

export function buildDraftGraph(
  recipeId: string,
  name: string,
  ingredients: string[],
  instructions: string[],
  servings = 2, // base yield of the recipe AS WRITTEN; the app scales per-person from this
  minServings?: number, // recommended smallest good batch (suggestion only)
): RecipeGraph {
  const nodes: TaskNode[] = instructions.map((text, i) => {
    const passive = PASSIVE.test(text);
    const phase: Phase = SERVE.test(text) ? "serve" : COOK.test(text) || passive ? "cook" : "prep";
    const attention = passive ? "passive" : "active";
    const est = estMins(text, phase);
    const nodeId = `${recipeId}_${i + 1}`;
    return {
      nodeId,
      recipeId,
      title: text.length > 60 ? text.slice(0, 57) + "…" : text,
      instruction: text,
      phase,
      attention,
      duration: { estMins: est, minMins: Math.max(1, Math.round(est * 0.7)), maxMins: Math.round(est * 1.5), elastic: ELASTIC.test(text) },
      // all ingredients attach to the first node as a draft (review refines per-step) — Doc 5 §3 rule 5
      ingredients: i === 0 ? ingredients.map(parseIngredient) : [],
      resources: phase === "cook" ? [{ category: "burner", count: 1 }] : [],
      // SAFE linear chain: each step depends on the previous (no invented parallelism)
      dependencies: i === 0 ? [] : [`${recipeId}_${i}`],
      reviewerNote: "auto-parsed draft — verify dependencies, durations, and active/passive tags",
    };
  });
  return {
    recipeId,
    name: name || "Untitled recipe",
    version: 1,
    servings,
    ...(minServings && minServings >= 1 ? { minServings } : {}),
    verified: false,
    nodes,
  };
}
