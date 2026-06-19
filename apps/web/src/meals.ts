// Saved meals & recently-cooked (Brief v12). Pure, deterministic, immutable helpers — ids and
// timestamps are supplied by the caller (App via Date.now) so this layer stays testable and the
// engine boundary is respected. All persistence is local (tutti.meals).

export interface SavedMeal {
  id: string;
  name: string;
  dishIds: string[];
  servings: Record<string, number>;
  target: string;
  savedAt: number;
  kind: "saved" | "recent";
}

/** True when two meals cover the same set of dishes (order-independent). */
export function sameDishSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/** Add/replace a named saved meal (dedupe by id), newest first, capped. */
export function addSaved(list: SavedMeal[], meal: SavedMeal, cap = 50): SavedMeal[] {
  const rest = list.filter((m) => m.id !== meal.id);
  return [meal, ...rest].slice(0, cap);
}

/** Auto-save a built plan: update the saved meal covering the same dish-set in place (keeping its
 *  id), else add it. Newest first, capped — so rebuilding the same meal refreshes one entry rather
 *  than cluttering the list. */
export function upsertSaved(list: SavedMeal[], meal: SavedMeal, cap = 50): SavedMeal[] {
  const match = list.find((m) => m.kind === "saved" && sameDishSet(m.dishIds, meal.dishIds));
  const id = match ? match.id : meal.id;
  const rest = list.filter((m) => m.id !== id);
  return [{ ...meal, id }, ...rest].slice(0, cap);
}

/** Record a just-cooked meal at the front of recents, collapsing an earlier cook of the same
 *  dish-set so re-cooking moves it up instead of duplicating. Saved meals are left untouched. */
export function addRecent(list: SavedMeal[], meal: SavedMeal, cap = 10): SavedMeal[] {
  const withoutDup = list.filter((m) => !(m.kind === "recent" && sameDishSet(m.dishIds, meal.dishIds)));
  const recents = withoutDup.filter((m) => m.kind === "recent");
  const others = withoutDup.filter((m) => m.kind !== "recent");
  return [meal, ...recents].slice(0, cap).concat(others);
}

export function removeMeal(list: SavedMeal[], id: string): SavedMeal[] {
  return list.filter((m) => m.id !== id);
}
