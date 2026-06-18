import type { SavedMeal } from "./meals";
import type { NotesMap } from "./recipeNotes";

// "What should I cook tonight?" (Brief v18) — pure ranking over the user's own saved/recent meals.
// Balances how much you LIKED a meal (ratings) against VARIETY (penalize just-cooked, since
// repetition is the cited weakness of meal planners). Deterministic: all time math from opts.nowMs.

const DAY = 86_400_000;

export function daysSince(ms: number | undefined, nowMs: number): number {
  if (ms == null || ms <= 0) return 999; // unknown → treat as long ago (favors trying it)
  return Math.max(0, (nowMs - ms) / DAY);
}

export interface Suggestion {
  meal: SavedMeal;
  reason: string;
}

export function suggestMeal(meals: SavedMeal[], notes: NotesMap, opts: { nowMs: number }): Suggestion | null {
  if (!meals.length) return null;

  const scored = meals.map((meal) => {
    const dishIds = meal.dishIds ?? []; // tolerate legacy/partial persisted meals
    const ratings = dishIds.map((id) => notes[id]?.rating).filter((r): r is number => typeof r === "number");
    const ratingAvg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const ratingTerm = ratingAvg ?? 3; // neutral when we have no opinion yet

    const recencyMs = Math.max(meal.savedAt ?? 0, ...dishIds.map((id) => notes[id]?.lastCookedAt ?? 0));
    const varietyTerm = (Math.min(daysSince(recencyMs, opts.nowMs), 14) / 14) * 2; // 0..2

    return { meal, dishCount: dishIds.length, ratingAvg, ratingTerm, varietyTerm, score: ratingTerm + varietyTerm };
  });

  scored.sort((a, b) =>
    b.score - a.score ||
    b.dishCount - a.dishCount ||
    (a.meal.id < b.meal.id ? -1 : 1),
  );
  const top = scored[0]!;

  const reason =
    top.ratingAvg !== null && top.ratingAvg >= 4
      ? "You rated this highly"
      : top.varietyTerm >= 1.5
        ? "You haven't made this in a while"
        : top.ratingAvg !== null
          ? "A favorite worth repeating"
          : "Something different tonight";

  return { meal: top.meal, reason };
}
