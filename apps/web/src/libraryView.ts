import { allergensOf, type RecipeGraph } from "@tutti/engine";
import type { NotesMap } from "./recipeNotes";

// Pure browse/search helpers for the recipe library (Brief v8 item 2). Derives display metadata
// and supports stackable filtering (the #1 thing users want — combine, not pick-one). No DOM.

export interface LibraryEntry {
  recipe: RecipeGraph;
  totalMins: number;
  allergens: string[];
  veg: boolean;
}

const NON_VEG = /\b(meat|chicken|mutton|beef|pork|lamb|fish|prawn|shrimp|crab|lobster|egg|anchov|bacon|ham)\b/i;

function isVeg(r: RecipeGraph): boolean {
  for (const n of r.nodes) for (const ing of n.ingredients) if (NON_VEG.test(ing.name)) return false;
  return true;
}

export function toLibraryEntries(recipes: RecipeGraph[]): LibraryEntry[] {
  return recipes.map((recipe) => ({
    recipe,
    totalMins: recipe.nodes.reduce((s, n) => s + n.duration.estMins, 0),
    allergens: allergensOf(recipe),
    veg: isVeg(recipe),
  }));
}

export interface LibraryFilter {
  query?: string;
  maxMins?: number;
  avoidAllergens?: string[];
  vegOnly?: boolean;
}

/** Stackable filter: every provided criterion must pass. Query matches name OR an ingredient name. */
export function filterLibrary(entries: LibraryEntry[], opts: LibraryFilter = {}): LibraryEntry[] {
  const q = opts.query?.trim().toLowerCase();
  const avoid = new Set(opts.avoidAllergens ?? []);
  return entries.filter((e) => {
    if (opts.vegOnly && !e.veg) return false;
    if (opts.maxMins !== undefined && e.totalMins > opts.maxMins) return false;
    if (avoid.size && e.allergens.some((a) => avoid.has(a))) return false;
    if (q) {
      const inName = e.recipe.name.toLowerCase().includes(q);
      const inIng = e.recipe.nodes.some((n) => n.ingredients.some((i) => i.name.toLowerCase().includes(q)));
      if (!inName && !inIng) return false;
    }
    return true;
  });
}

// Soft ordering for the library (Brief v38) — reorders without excluding (compose after filtering).
export type SortKey = "default" | "quickest" | "rated" | "cooked";

export function sortLibrary(entries: LibraryEntry[], key: SortKey, notes: NotesMap = {}): LibraryEntry[] {
  const idx = new Map(entries.map((e, i) => [e.recipe.recipeId, i]));
  const tie = (a: LibraryEntry, b: LibraryEntry) => idx.get(a.recipe.recipeId)! - idx.get(b.recipe.recipeId)!;
  const arr = [...entries];
  switch (key) {
    case "quickest":
      return arr.sort((a, b) => a.totalMins - b.totalMins || tie(a, b));
    case "rated":
      return arr.sort((a, b) => (notes[b.recipe.recipeId]?.rating ?? 0) - (notes[a.recipe.recipeId]?.rating ?? 0) || tie(a, b));
    case "cooked":
      return arr.sort((a, b) => (notes[b.recipe.recipeId]?.cookCount ?? 0) - (notes[a.recipe.recipeId]?.cookCount ?? 0) || tie(a, b));
    default:
      return arr;
  }
}
