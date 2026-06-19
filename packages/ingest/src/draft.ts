// Shared "draft RecipeGraph" builder (Doc 5). Turns a name + ingredient strings + instruction
// strings into a candidate graph with conservative, SAFE defaults: linear step dependencies (never
// invents parallelism that the physics may not allow — Doc 5 rule 4), ambiguous attention => active
// (P3 fail-safe), heat/rest keywords => cook/passive. A human or the AiParser refines from here.

import type { Ingredient, Phase, RecipeGraph, TaskNode } from "@tutti/engine";

const PASSIVE = /\b(simmer|bake|boil|roast|rest|chill|marinate|refrigerate|cool|proof|rise|set aside|steep|soak)\b/i;
const COOK = /\b(cook|bake|fry|saut|boil|simmer|roast|grill|heat|temper|toast|steam|sear|braise|caramel)\b/i;
const SERVE = /\b(serve|plate|garnish|sprinkle over|drizzle over|enjoy)\b/i;
const ELASTIC = /\b(chop|dice|slice|mince|knead|grate|peel|cut|whisk|beat|fold|mix|stir together)\b/i;

/** Loosely parse "1 1/2 cups flour" -> { amount, unit, name }. Falls back to the raw string. */
export function parseIngredient(raw: string): Ingredient {
  const s = raw.trim();
  const m = s.match(/^([\d]+(?:[.\/][\d]+)?)\s*([a-zA-Z]+)?\s+(.*)$/);
  if (m && m[3]) {
    const amount = m[1]!.includes("/")
      ? (() => { const [a, b] = m[1]!.split("/").map(Number); return b ? a! / b! : Number(m[1]); })()
      : Number(m[1]);
    return { name: m[3]!.trim(), amount: Number.isFinite(amount) ? amount : undefined, unit: m[2] };
  }
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
  return { recipeId, name: name || "Untitled recipe", version: 1, servings, verified: false, nodes };
}
