import { describe, it, expect } from "vitest";
import { suggestMeal, daysSince } from "./suggest";
import type { SavedMeal } from "./meals";
import type { NotesMap } from "./recipeNotes";

const NOW = 1_000 * 86_400_000; // a fixed "now" in ms
const daysAgo = (d: number) => NOW - d * 86_400_000;

const meal = (id: string, dishIds: string[], savedAt: number): SavedMeal => ({
  id, name: id, dishIds, servings: {}, target: "19:30:00", savedAt, kind: "saved",
});

describe("daysSince", () => {
  it("treats unknown as long ago and never goes negative", () => {
    expect(daysSince(undefined, NOW)).toBe(999);
    expect(daysSince(daysAgo(3), NOW)).toBeCloseTo(3);
    expect(daysSince(NOW + 86_400_000, NOW)).toBe(0);
  });
});

describe("suggestMeal (Brief v18 item 1)", () => {
  it("returns null with no meals", () => {
    expect(suggestMeal([], {}, { nowMs: NOW })).toBeNull();
  });

  it("prefers a highly-rated older meal over a low-rated recent one", () => {
    const meals = [meal("loved", ["a"], daysAgo(20)), meal("meh", ["b"], daysAgo(1))];
    const notes: NotesMap = { a: { rating: 5, cookCount: 3 }, b: { rating: 2, cookCount: 1 } };
    const s = suggestMeal(meals, notes, { nowMs: NOW })!;
    expect(s.meal.id).toBe("loved");
    expect(s.reason).toMatch(/rated this highly/i);
  });

  it("demotes a just-cooked meal vs an equally-rated older one (variety)", () => {
    const meals = [meal("fresh", ["a"], daysAgo(15)), meal("justcooked", ["b"], daysAgo(15))];
    const notes: NotesMap = {
      a: { rating: 4, cookCount: 1 },
      b: { rating: 4, cookCount: 1, lastCookedAt: NOW }, // cooked today
    };
    const s = suggestMeal(meals, notes, { nowMs: NOW })!;
    expect(s.meal.id).toBe("fresh");
  });

  it("tolerates a legacy/malformed meal missing dishIds", () => {
    const bad = { id: "legacy", name: "old", target: "19:30:00" } as unknown as SavedMeal;
    expect(() => suggestMeal([bad], {}, { nowMs: NOW })).not.toThrow();
    expect(suggestMeal([bad], {}, { nowMs: NOW })!.meal.id).toBe("legacy");
  });

  it("explains an unrated, long-ago meal as something different", () => {
    const s = suggestMeal([meal("x", ["a"], daysAgo(30))], {}, { nowMs: NOW })!;
    expect(s.reason).toMatch(/haven't made this in a while|something different/i);
  });
});
