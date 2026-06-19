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
  cuisine?: string; // exact match on recipe.cuisine; undefined/"" = all cuisines
}

/** Stackable filter: every provided criterion must pass. Query matches name OR an ingredient name. */
export function filterLibrary(entries: LibraryEntry[], opts: LibraryFilter = {}): LibraryEntry[] {
  const q = opts.query?.trim().toLowerCase();
  const avoid = new Set(opts.avoidAllergens ?? []);
  return entries.filter((e) => {
    if (opts.vegOnly && !e.veg) return false;
    if (opts.cuisine && e.recipe.cuisine !== opts.cuisine) return false;
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

/** Distinct cuisines present in a set of entries, sorted — for building the cuisine filter UI. */
export function cuisinesOf(entries: LibraryEntry[]): string[] {
  return [...new Set(entries.map((e) => e.recipe.cuisine).filter((c): c is string => !!c))].sort();
}

// ---- Discovery grouping (recents/frequent + cuisine → dish) -------------------------------------
// There is no `course` field on a recipe yet, so we infer a dish-type from the name. This works for
// library, pasted and AI recipes alike; it can graduate to a real schema field as the library grows.
const COURSE_RULES: [RegExp, string][] = [
  [/chutney|thogayal|podi|dip|sauce/i, "Chutneys & sauces"],
  [/rasam|sambar|kuzhambu|kootu|\bdal\b|curry|gravy|masala|stew|soup/i, "Gravies & curries"],
  [/upma|pongal|dosa|idli|uttapam|paratha|roti|poori|tiffin|breakfast/i, "Tiffin & breakfast"],
  [/pasta|aglio|spaghetti|penne|noodle|ramen|chow ?mein|hakka/i, "Pasta & noodles"],
  [/rice|biryani|biriyani|pulao|pilaf|fried rice/i, "Rice"],
  [/poriyal|thoran|sabzi|stir.?fry|\bfry\b|side/i, "Sides & stir-fries"],
];

/** Infer a dish-type / course for grouping within a cuisine. */
export function courseOf(recipe: RecipeGraph): string {
  for (const [re, course] of COURSE_RULES) if (re.test(recipe.name)) return course;
  return "Other dishes";
}

export interface CuisineGroup {
  cuisine: string;
  entries: LibraryEntry[];
  courses: { course: string; entries: LibraryEntry[] }[]; // populated only when sub-grouping helps
}

/** Group entries by cuisine (largest first), and within a cuisine by course when there's variety. */
export function groupByCuisine(entries: LibraryEntry[]): CuisineGroup[] {
  const byCuisine = new Map<string, LibraryEntry[]>();
  for (const e of entries) {
    const c = e.recipe.cuisine || "Other";
    (byCuisine.get(c) ?? byCuisine.set(c, []).get(c)!).push(e);
  }
  const order = COURSE_RULES.map(([, c]) => c).concat("Other dishes");
  return [...byCuisine.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([cuisine, es]) => {
      // Sub-group by course only when it's worth it (enough dishes spread over enough courses).
      const courseMap = new Map<string, LibraryEntry[]>();
      for (const e of es) {
        const k = courseOf(e.recipe);
        (courseMap.get(k) ?? courseMap.set(k, []).get(k)!).push(e);
      }
      const courses = es.length >= 4 && courseMap.size >= 2
        ? [...courseMap.entries()]
            .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
            .map(([course, ce]) => ({ course, entries: ce }))
        : [];
      return { cuisine, entries: es, courses };
    });
}

/** Recents (by last cooked) and frequents (by cook count), history-only. Newest/most first. */
export function pickHistory(entries: LibraryEntry[], notes: NotesMap): { recents: LibraryEntry[]; frequent: LibraryEntry[] } {
  const recents = entries
    .filter((e) => notes[e.recipe.recipeId]?.lastCookedAt)
    .sort((a, b) => (notes[b.recipe.recipeId]?.lastCookedAt ?? 0) - (notes[a.recipe.recipeId]?.lastCookedAt ?? 0));
  const frequent = entries
    .filter((e) => (notes[e.recipe.recipeId]?.cookCount ?? 0) > 0)
    .sort((a, b) => (notes[b.recipe.recipeId]?.cookCount ?? 0) - (notes[a.recipe.recipeId]?.cookCount ?? 0));
  return { recents, frequent };
}
