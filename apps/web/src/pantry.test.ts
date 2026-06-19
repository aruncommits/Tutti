import { describe, it, expect } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import {
  isStaple, hasInPantry, toggleStaple, partitionByPantry, migratePantry,
  addPantryItem, removePantryItem, expiringSoon, pantryMatch, type Pantry,
} from "./pantry";

describe("pantry model (Brief v21 → v46)", () => {
  it("migrates the legacy string[] of staples", () => {
    const migrated = migratePantry(["Salt", "Rice"]);
    expect(migrated).toEqual([{ name: "salt", staple: true }, { name: "rice", staple: true }]);
    expect(migratePantry([{ name: "Toor Dal", qty: 2, unit: "cup" }])[0]).toMatchObject({ name: "toor dal", qty: 2 });
    expect(migratePantry("garbage")).toEqual([]);
  });

  it("matches staples & inventory by normalized name", () => {
    const pantry: Pantry = [{ name: "salt", staple: true }, { name: "rice", qty: 1, unit: "kg" }];
    expect(isStaple("Salt", pantry)).toBe(true);
    expect(isStaple("Rice", pantry)).toBe(false); // present but not a staple
    expect(hasInPantry(pantry, "RICE")).toBe(true);
  });

  it("toggles a staple on then off, immutably", () => {
    const empty: Pantry = [];
    const added = toggleStaple(empty, "Mustard seeds");
    expect(isStaple("mustard seeds", added)).toBe(true);
    expect(empty).toEqual([]);
    expect(isStaple("mustard seeds", toggleStaple(added, "mustard seeds"))).toBe(false);
  });

  it("adds and removes inventory items (dedupe by name)", () => {
    let p: Pantry = [];
    p = addPantryItem(p, { name: "Tomato", qty: 3, unit: "whole" });
    p = addPantryItem(p, { name: "tomato", qty: 5 }); // same name → replace
    expect(p).toHaveLength(1);
    expect(p[0]!.qty).toBe(5);
    expect(removePantryItem(p, "TOMATO")).toEqual([]);
  });

  it("partitions a shopping list into toBuy vs on-hand", () => {
    const items = [{ name: "salt" }, { name: "rice" }, { name: "Oil" }];
    const pantry: Pantry = [{ name: "salt", staple: true }, { name: "oil", qty: 1 }];
    const { toBuy, staples } = partitionByPantry(items, pantry);
    expect(staples.map((s) => s.name)).toEqual(["salt", "Oil"]);
    expect(toBuy.map((s) => s.name)).toEqual(["rice"]);
  });

  it("flags items expiring within the window", () => {
    const pantry: Pantry = [
      { name: "milk", expiry: "2026-06-20" },
      { name: "rice", expiry: "2026-12-01" },
      { name: "salt", staple: true },
    ];
    const soon = expiringSoon(pantry, "2026-06-18", 3).map((p) => p.name);
    expect(soon).toContain("milk");
    expect(soon).not.toContain("rice");
  });

  it("scores how much of a recipe is on hand", () => {
    const sambar = goldenLibrary.find((r) => r.recipeId === "rec_sambar")!;
    const empty = pantryMatch(sambar, []);
    expect(empty.have).toBe(0);
    expect(empty.total).toBeGreaterThan(0);
    const stocked = pantryMatch(sambar, [{ name: "toor dal" }, { name: "salt" }, { name: "water" }]);
    expect(stocked.have).toBeGreaterThan(0);
    expect(stocked.ratio).toBeGreaterThan(0);
    expect(stocked.ratio).toBeLessThanOrEqual(1);
  });
});
