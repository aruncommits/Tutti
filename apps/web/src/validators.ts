import type { Screen } from "./state";

// Lightweight shape guards for persisted state (Brief v23). Not full schema validation — just
// enough that wrong-shaped/legacy localStorage falls back to a sane default instead of crashing.

export function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** A saved-meals array whose items at least carry an id + a dishIds string array (Brief v12/v17). */
export function isMealArray(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.every((m) => isPlainObject(m) && typeof m.id === "string" && isStringArray((m as { dishIds?: unknown }).dishIds))
  );
}

const SCREENS: ReadonlySet<Screen> = new Set<Screen>([
  "onboarding", "kitchen", "home", "calendar", "addRecipe", "studio", "browse", "recipe", "shopping", "pantry",
  "stats", "meals", "settings", "pick", "serveTime", "preview", "ready", "cook", "done",
]);

export function isScreen(v: unknown): v is Screen {
  return typeof v === "string" && SCREENS.has(v as Screen);
}

export function isClock(v: unknown): v is string {
  return typeof v === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(v);
}
