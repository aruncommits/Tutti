// Allergen detection (Doc 6; Brief v4 item 5). The 14 EU major allergens (Regulation 1169/2011).
// detectAllergens() is a deterministic keyword heuristic over ingredient names — a "may contain"
// fallback for ingested recipes that lack explicit tags. Never authoritative: a human/expert tag
// (RecipeGraph.allergens) overrides it (Doc 6 §5 — safety is expert-gated, never crowd-decided).

import type { RecipeGraph } from "./types";

export const ALLERGENS = [
  "gluten", "crustaceans", "eggs", "fish", "peanuts", "soybeans", "milk",
  "nuts", "celery", "mustard", "sesame", "sulphites", "lupin", "molluscs",
] as const;

export type Allergen = (typeof ALLERGENS)[number];

const RULES: Array<[RegExp, Allergen]> = [
  [/\b(wheat|flour|maida|semolina|rava|sooji|bread|pasta|noodle|barley|rye|roti|chapati|atta|seitan)\b/i, "gluten"],
  [/\b(prawn|shrimp|crab|lobster|crayfish)\b/i, "crustaceans"],
  [/\beggs?\b/i, "eggs"],
  [/\b(fish|anchov|tuna|salmon|cod|sardine)\b/i, "fish"],
  [/\b(peanut|groundnut)s?\b/i, "peanuts"],
  [/\b(soy|soya|tofu|edamame|tempeh)\b/i, "soybeans"],
  [/\b(milk|butter|ghee|paneer|cheese|cream|curd|yogh?urt|dairy|khoya|malai)\b/i, "milk"],
  [/\b(cashew|almond|walnut|pistachio|hazelnut|pecan|nut)s?\b/i, "nuts"],
  [/\bcelery\b/i, "celery"],
  [/\bmustard\b/i, "mustard"],
  [/\bsesame\b/i, "sesame"],
  [/\b(sulphite|sulfite|wine)\b/i, "sulphites"],
  [/\blupin\b/i, "lupin"],
  [/\b(mussel|clam|oyster|squid|octopus|scallop|snail)s?\b/i, "molluscs"],
];

/** Infer likely allergens from ingredient names. Returns sorted, unique tags ("may contain"). */
export function detectAllergens(graph: RecipeGraph): string[] {
  const found = new Set<string>();
  for (const node of graph.nodes) {
    for (const ing of node.ingredients) {
      for (const [re, tag] of RULES) if (re.test(ing.name)) found.add(tag);
    }
  }
  return [...found].sort();
}

/** Explicit tags if present (authoritative), else the heuristic. */
export function allergensOf(graph: RecipeGraph): string[] {
  return graph.allergens ?? detectAllergens(graph);
}
