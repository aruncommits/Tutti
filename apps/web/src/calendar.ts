// Weekly meal-planning calendar (Brief v45). Pure, immutable helpers over a date→slots map. A
// planned meal snapshots its dishes/servings (so it survives even if a saved meal is deleted) and
// can link back to a saved meal. Dates are ISO "YYYY-MM-DD"; callers pass `now` for testability.

import type { SavedMeal } from "./meals";

export const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type Slot = (typeof SLOTS)[number];

export interface PlannedMeal {
  id: string;
  /** snapshot — the dishes for this slot. */
  dishIds: string[];
  servings: Record<string, number>;
  target?: string | null;
  name: string;
  /** optional link to the saved meal it came from. */
  mealId?: string;
  /** when this is a leftover of another day's cook. */
  leftoverOf?: string;
}

export type DayPlan = Partial<Record<Slot, PlannedMeal>>;
export type Calendar = Record<string, DayPlan>; // keyed by ISO date

// ---- date helpers (deterministic from their inputs; no Date.now inside) -------------------------

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** ISO date of the Monday on/just before the given date. */
export function weekStartISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDaysISO(iso, -dow);
}

/** The 7 ISO dates of the week containing `iso`, Monday first. */
export function weekDaysISO(iso: string): string[] {
  const start = weekStartISO(iso);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
}

export function weekdayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}
export function dayNumber(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// ---- planning helpers --------------------------------------------------------------------------

export function plannedFromSaved(meal: SavedMeal, id: string): PlannedMeal {
  return { id, dishIds: meal.dishIds, servings: meal.servings, target: meal.target, name: meal.name, mealId: meal.id };
}

export function plannedFromDishes(dishIds: string[], servings: Record<string, number>, name: string, id: string, target?: string | null): PlannedMeal {
  return { id, dishIds, servings, target: target ?? null, name };
}

export function assignMeal(cal: Calendar, dateISO: string, slot: Slot, meal: PlannedMeal): Calendar {
  return { ...cal, [dateISO]: { ...cal[dateISO], [slot]: meal } };
}

export function clearSlot(cal: Calendar, dateISO: string, slot: Slot): Calendar {
  const day = { ...cal[dateISO] };
  delete day[slot];
  const next = { ...cal, [dateISO]: day };
  if (Object.keys(day).length === 0) delete next[dateISO];
  return next;
}

export function moveMeal(cal: Calendar, from: { dateISO: string; slot: Slot }, to: { dateISO: string; slot: Slot }): Calendar {
  const meal = cal[from.dateISO]?.[from.slot];
  if (!meal) return cal;
  return assignMeal(clearSlot(cal, from.dateISO, from.slot), to.dateISO, to.slot, meal);
}

/** Mark a slot as the leftover of an earlier cook (same dishes, flagged). */
export function planLeftover(cal: Calendar, source: PlannedMeal, dateISO: string, slot: Slot, id: string): Calendar {
  return assignMeal(cal, dateISO, slot, { ...source, id, name: `${source.name} (leftovers)`, leftoverOf: source.id });
}

/** All planned (non-leftover) meals across the given days — for a week shopping list. */
export function mealsInDays(cal: Calendar, days: string[]): PlannedMeal[] {
  const out: PlannedMeal[] = [];
  for (const iso of days) {
    const day = cal[iso];
    if (!day) continue;
    for (const slot of SLOTS) {
      const m = day[slot];
      if (m && !m.leftoverOf) out.push(m);
    }
  }
  return out;
}

/** Count of planned slots in a day (for the week-grid summary). */
export function dayCount(cal: Calendar, iso: string): number {
  const day = cal[iso];
  return day ? Object.keys(day).length : 0;
}
