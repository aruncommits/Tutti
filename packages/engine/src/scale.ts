// Recipe scaling (Doc 6; Brief v4 item 1). Most ingredients scale linearly with servings, but
// seasoning/acid and leavening/yeast do NOT — flavour and chemistry don't track volume. We dampen
// the *change* for those (preserving identity at factor 1) and flag the node so the cook adjusts to
// taste. Pure arithmetic over data (P1), no LLM. A scaled graph still passes validate().

import type { Ingredient, RecipeGraph, TaskNode } from "./types";

const SEASONING = /\b(salt|pepper|chil[il]|spice|masala|cumin|turmeric|paprika|cayenne|lemon|lime|vinegar|tamarind|acid|sugar|jaggery|garam)\b/i;
const LEAVENING = /\b(baking\s*(powder|soda)|bicarbonate)\b/i;
const YEAST = /\byeast\b/i;

/** Dampen factor for non-linear ingredients: effective = 1 + (factor-1)*d (identity at factor 1). */
function dampenOf(name: string): number | null {
  if (YEAST.test(name)) return 0.75;
  if (LEAVENING.test(name)) return 0.8;
  if (SEASONING.test(name)) return 0.8;
  return null; // linear
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Return a new RecipeGraph scaled by `factor`. factor 1 is the identity (same reference). */
export function scaleRecipe(graph: RecipeGraph, factor: number): RecipeGraph {
  if (factor === 1) return graph;

  const nodes: TaskNode[] = graph.nodes.map((n) => {
    let flagged = false;
    const ingredients: Ingredient[] = n.ingredients.map((ing) => {
      if (ing.amount === undefined) return ing;
      const d = dampenOf(ing.name);
      const effective = d === null ? factor : 1 + (factor - 1) * d;
      if (d !== null) flagged = true;
      return { ...ing, amount: round2(ing.amount * effective) };
    });
    const node: TaskNode = { ...n, ingredients };
    if (flagged) node.scaleNote = "seasoning/leavening scaled conservatively — adjust to taste";
    return node;
  });

  return { ...graph, servings: Math.max(1, Math.round(graph.servings * factor)), nodes };
}
