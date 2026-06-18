import { useEffect, useState } from "react";

// The single-recipe flow as an explicit screen state machine (Doc 7 §1). The cook screen is
// always a pure render of the engine's deriveViewState; the other screens feed compile().
export type Screen =
  | "onboarding"
  | "kitchen"
  | "home"
  | "addRecipe"
  | "browse"
  | "recipe"
  | "shopping"
  | "stats"
  | "meals"
  | "settings"
  | "pick"
  | "serveTime"
  | "preview"
  | "ready"
  | "cook"
  | "done";

export const SCREEN_ORDER: Screen[] = [
  "onboarding",
  "kitchen",
  "home",
  "pick",
  "serveTime",
  "preview",
  "cook",
  "done",
];

/**
 * Pure read of a persisted value (Brief v23): falls back to `initial` on missing key, unparseable
 * JSON, OR a parsed value that fails `validate` — so legacy/corrupt data self-heals, never crashes.
 */
export function readPersisted<T>(raw: string | null, initial: T, validate?: (v: unknown) => boolean): T {
  if (raw === null) return initial;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return initial;
    return parsed as T;
  } catch {
    return initial;
  }
}

/** useState mirrored to localStorage so an in-progress session survives reload (Doc 1 P4). */
export function usePersistentState<T>(
  key: string,
  initial: T,
  validate?: (v: unknown) => boolean,
): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      return readPersisted(localStorage.getItem(key), initial, validate);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full / unavailable — non-fatal, the session just won't persist */
    }
  }, [key, value]);
  return [value, setValue];
}
