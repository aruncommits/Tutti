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
  "stats", "meals", "settings", "preview", "ready", "cook",
]);

export function isScreen(v: unknown): v is Screen {
  return typeof v === "string" && SCREENS.has(v as Screen);
}

export function isClock(v: unknown): v is string {
  return typeof v === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(v);
}

/** A persisted MasterExecutionPlan: enough shape that a corrupt save self-heals to an empty plan
 *  instead of leaning on the error boundary (Brief v48 — the deferred cook-resume follow-up). */
export function isPlan(v: unknown): boolean {
  return (
    isPlainObject(v) &&
    Array.isArray((v as { nodes?: unknown }).nodes) &&
    isPlainObject((v as { schedule?: unknown }).schedule) &&
    typeof (v as { startTime?: unknown }).startTime === "string" &&
    typeof (v as { projectedServeTime?: unknown }).projectedServeTime === "string"
  );
}
