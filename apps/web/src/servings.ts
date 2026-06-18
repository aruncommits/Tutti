// Meal-level scaling (Brief v26) — turn "cooking for N people?" into a per-dish scale factor.
// Whole-number factors keep it consistent with the per-dish 1x/2x/3x chips and the engine's
// integer-friendly scaleRecipe. Clamped to a sane range.

export function factorForPeople(baseServings: number, people: number): number {
  return Math.max(1, Math.min(6, Math.round(people / Math.max(1, baseServings))));
}

export function peopleFromFactor(baseServings: number, factor: number): number {
  return baseServings * factor;
}
