import { normalizeIngredientName } from "@tutti/engine";

// Pantry staples (Brief v21) — ingredient names the cook always has, so the shopping list shows
// only what to actually buy. Matched by the engine's normalized name (same key consolidation uses).

export type Pantry = string[]; // normalized staple names

export function isStaple(name: string, pantry: Pantry): boolean {
  return pantry.includes(normalizeIngredientName(name));
}

export function toggleStaple(pantry: Pantry, name: string): Pantry {
  const k = normalizeIngredientName(name);
  return pantry.includes(k) ? pantry.filter((x) => x !== k) : [...pantry, k];
}

export function partitionByPantry<T extends { name: string }>(items: T[], pantry: Pantry): { toBuy: T[]; staples: T[] } {
  const toBuy: T[] = [];
  const staples: T[] = [];
  for (const it of items) (isStaple(it.name, pantry) ? staples : toBuy).push(it);
  return { toBuy, staples };
}
