// The whole-meal feasibility dial (Brief v41). Pure formatter over values App.tsx already computes
// from the scheduler — it recomputes nothing. Tier choices change the makespan upstream; this just
// reads it back as a verdict so the user can see when a meal is too ambitious for their time/hands.

export type FitVerdict = "fits" | "tight" | "over";

export interface MealFit {
  makespanMins: number;
  feasible: boolean;
  verdict: FitVerdict;
  /** a short nudge when the meal is tight/over; empty when it fits. */
  hint: string;
}

// One cook can only do one active task at a time, so a long hands-on meal gets "tight" past ~75 min.
const TIGHT_MINS = 75;

export function mealFit(makespanMins: number, cooks: number, serveAt: string | null, feasible: boolean): MealFit {
  if (serveAt && !feasible) {
    return { makespanMins, feasible, verdict: "over", hint: "Won't be ready by then — pick simpler tiers, add a cook, or serve later." };
  }
  if (cooks <= 1 && makespanMins > TIGHT_MINS) {
    return { makespanMins, feasible, verdict: "tight", hint: "That's a lot for one cook — simpler tiers will get it done sooner." };
  }
  return { makespanMins, feasible, verdict: "fits", hint: "" };
}
