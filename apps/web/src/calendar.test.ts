import { describe, it, expect } from "vitest";
import {
  weekStartISO, weekDaysISO, addDaysISO, toISO,
  assignMeal, clearSlot, moveMeal, planLeftover, mealsInDays, dayCount,
  plannedFromSaved, type Calendar, type PlannedMeal,
} from "./calendar";
import type { SavedMeal } from "./meals";

const meal = (id: string, dishIds: string[]): PlannedMeal => ({ id, dishIds, servings: {}, name: id });

describe("calendar date helpers", () => {
  it("weekStartISO returns the Monday of the week", () => {
    expect(weekStartISO("2026-06-18")).toBe("2026-06-15"); // 18th is a Thursday → Mon 15th
    expect(weekStartISO("2026-06-15")).toBe("2026-06-15"); // a Monday maps to itself
  });
  it("weekDaysISO yields 7 consecutive days Monday-first", () => {
    const days = weekDaysISO("2026-06-18");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-06-15");
    expect(days[6]).toBe("2026-06-21");
  });
  it("addDaysISO crosses month boundaries", () => {
    expect(addDaysISO("2026-06-30", 1)).toBe("2026-07-01");
  });
  it("toISO formats a date", () => {
    expect(toISO(new Date("2026-01-05T09:00:00"))).toBe("2026-01-05");
  });
});

describe("calendar planning", () => {
  it("assigns and clears a slot, pruning empty days", () => {
    let cal: Calendar = {};
    cal = assignMeal(cal, "2026-06-18", "dinner", meal("m1", ["a", "b"]));
    expect(cal["2026-06-18"]!.dinner!.name).toBe("m1");
    expect(dayCount(cal, "2026-06-18")).toBe(1);
    cal = clearSlot(cal, "2026-06-18", "dinner");
    expect(cal["2026-06-18"]).toBeUndefined(); // day pruned when empty
  });

  it("moves a meal between days/slots", () => {
    let cal = assignMeal({}, "2026-06-18", "dinner", meal("m1", ["a"]));
    cal = moveMeal(cal, { dateISO: "2026-06-18", slot: "dinner" }, { dateISO: "2026-06-19", slot: "lunch" });
    expect(cal["2026-06-18"]).toBeUndefined();
    expect(cal["2026-06-19"]!.lunch!.name).toBe("m1");
  });

  it("plans a leftover that is excluded from the shopping aggregation", () => {
    const source = meal("Biryani", ["rice", "chicken"]);
    let cal = assignMeal({}, "2026-06-18", "dinner", source);
    cal = planLeftover(cal, source, "2026-06-19", "lunch", "lo1");
    expect(cal["2026-06-19"]!.lunch!.leftoverOf).toBe(source.id);
    const days = ["2026-06-18", "2026-06-19"];
    const shop = mealsInDays(cal, days);
    expect(shop).toHaveLength(1); // leftover not re-shopped
    expect(shop[0]!.name).toBe("Biryani");
  });

  it("plannedFromSaved snapshots the saved meal", () => {
    const saved: SavedMeal = { id: "s1", name: "Sunday", dishIds: ["a"], servings: { a: 2 }, target: "13:00:00", savedAt: 0, kind: "saved" };
    const pm = plannedFromSaved(saved, "p1");
    expect(pm).toMatchObject({ id: "p1", dishIds: ["a"], servings: { a: 2 }, name: "Sunday", mealId: "s1" });
  });
});
