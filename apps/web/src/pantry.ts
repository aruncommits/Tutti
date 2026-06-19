import { normalizeIngredientName, type RecipeGraph } from "@tutti/engine";

// Pantry inventory (Brief v21 → v46). What you have on hand: staples you "always have" (hidden from
// the shopping list) and tracked items with optional quantity + expiry. Matched by the engine's
// normalized name (same key the shopping consolidation uses). Back-compatible with the old string[].

export interface PantryItem {
  name: string;       // normalized
  qty?: number;
  unit?: string;
  expiry?: string;    // ISO date
  staple?: boolean;   // "always have" → never shown as a thing to buy
}
export type Pantry = PantryItem[];

/** Accept the legacy `string[]` of staple names OR the new `PantryItem[]`. */
export function migratePantry(raw: unknown): Pantry {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) =>
    typeof x === "string"
      ? { name: normalizeIngredientName(x), staple: true }
      : (x && typeof x === "object" && typeof (x as PantryItem).name === "string"
          ? { ...(x as PantryItem), name: normalizeIngredientName((x as PantryItem).name) }
          : null),
  ).filter((x): x is PantryItem => x !== null);
}

const keyOf = (name: string) => normalizeIngredientName(name);
const find = (pantry: Pantry, name: string) => pantry.find((p) => p.name === keyOf(name));

export function hasInPantry(pantry: Pantry, name: string): boolean {
  return find(pantry, name) !== undefined;
}
export function isStaple(name: string, pantry: Pantry): boolean {
  return find(pantry, name)?.staple === true;
}

/** Toggle the "always have" flag for a name (used from the shopping list 🏠 button). */
export function toggleStaple(pantry: Pantry, name: string): Pantry {
  const k = keyOf(name);
  const existing = pantry.find((p) => p.name === k);
  if (!existing) return [...pantry, { name: k, staple: true }];
  if (existing.staple) {
    // turning off: drop the item entirely if it carried no other info
    const bare = existing.qty === undefined && existing.expiry === undefined;
    return bare ? pantry.filter((p) => p.name !== k) : pantry.map((p) => (p.name === k ? { ...p, staple: false } : p));
  }
  return pantry.map((p) => (p.name === k ? { ...p, staple: true } : p));
}

export function addPantryItem(pantry: Pantry, item: PantryItem): Pantry {
  const k = keyOf(item.name);
  const rest = pantry.filter((p) => p.name !== k);
  return [...rest, { ...item, name: k }];
}
export function removePantryItem(pantry: Pantry, name: string): Pantry {
  return pantry.filter((p) => p.name !== keyOf(name));
}

/** Partition shopping items into what to buy vs. what's already on hand. */
export function partitionByPantry<T extends { name: string }>(items: T[], pantry: Pantry): { toBuy: T[]; staples: T[] } {
  const toBuy: T[] = [];
  const staples: T[] = [];
  for (const it of items) (hasInPantry(pantry, it.name) ? staples : toBuy).push(it);
  return { toBuy, staples };
}

/** Items expiring on/before `todayISO + days`. */
export function expiringSoon(pantry: Pantry, todayISO: string, days = 3): PantryItem[] {
  const limit = new Date(`${todayISO}T00:00:00`);
  limit.setDate(limit.getDate() + days);
  return pantry.filter((p) => p.expiry && new Date(`${p.expiry}T00:00:00`) <= limit);
}

/** How much of a recipe you already have (by distinct ingredient name). */
export function pantryMatch(recipe: RecipeGraph, pantry: Pantry): { have: number; total: number; ratio: number } {
  const names = new Set<string>();
  for (const node of recipe.nodes) for (const ing of node.ingredients) names.add(keyOf(ing.name));
  let have = 0;
  for (const n of names) if (pantry.some((p) => p.name === n)) have++;
  const total = names.size;
  return { have, total, ratio: total === 0 ? 0 : have / total };
}
