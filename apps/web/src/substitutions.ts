import { normalizeIngredientName } from "@tutti/engine";

// Curated ingredient substitutions (Brief v25) — frozen, human-curated data for the seeded South
// Indian vertical (Doc 1 §4: no LLM on the cooking path). Keyed by the engine's normalized name so
// "grated coconut" and "Coconut" both resolve. Honest: sometimes the right answer is "just omit".

export interface Substitute {
  swap: string;
  note?: string;
}

const RAW: Record<string, Substitute[]> = {
  tamarind: [{ swap: "lemon juice + a pinch of sugar", note: "brighter, less deep" }],
  "tamarind pulp": [{ swap: "lemon juice + a pinch of sugar", note: "brighter, less deep" }],
  ghee: [{ swap: "neutral oil or butter" }],
  "curry leaves": [{ swap: "just omit", note: "aroma only — no real substitute" }],
  coconut: [{ swap: "unsweetened desiccated coconut" }, { swap: "omit" }],
  "mustard seeds": [{ swap: "omit", note: "skips the tempering pop" }],
  "urad dal": [{ swap: "omit" }],
  "chana dal": [{ swap: "roasted gram (pottukadalai)" }],
  "roasted chana dal": [{ swap: "roasted peanuts", note: "for crunch in chutney" }],
  "green chili": [{ swap: "¼ tsp red chili powder per chili" }],
  jaggery: [{ swap: "brown sugar" }],
  asafoetida: [{ swap: "a small pinch of garlic powder" }],
  rava: [{ swap: "cream of wheat / semolina", note: "same thing" }],
  yogurt: [{ swap: "buttermilk", note: "thinner — use a little less liquid" }],
  "coconut oil": [{ swap: "any neutral oil" }],
  "sesame oil": [{ swap: "any neutral oil" }],
};

// Freeze so the curated data can't be mutated at runtime.
export const SUBSTITUTIONS: Readonly<Record<string, Substitute[]>> = Object.freeze(RAW);

export function substitutesFor(name: string): Substitute[] {
  return SUBSTITUTIONS[normalizeIngredientName(name)] ?? [];
}
