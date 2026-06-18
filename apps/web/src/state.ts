import { useEffect, useState } from "react";

// The single-recipe flow as an explicit screen state machine (Doc 7 §1). The cook screen is
// always a pure render of the engine's deriveViewState; the other screens feed compile().
export type Screen =
  | "onboarding"
  | "kitchen"
  | "home"
  | "addRecipe"
  | "browse"
  | "shopping"
  | "stats"
  | "pick"
  | "serveTime"
  | "preview"
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

/** useState mirrored to localStorage so an in-progress session survives reload (Doc 1 P4). */
export function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
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
