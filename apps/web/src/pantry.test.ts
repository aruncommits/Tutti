import { describe, it, expect } from "vitest";
import { isStaple, toggleStaple, partitionByPantry, type Pantry } from "./pantry";

describe("pantry (Brief v21 item 1)", () => {
  it("matches staples by normalized name (case-insensitive)", () => {
    const pantry: Pantry = ["salt"];
    expect(isStaple("Salt", pantry)).toBe(true);
    expect(isStaple("salt", pantry)).toBe(true);
    expect(isStaple("rice", pantry)).toBe(false);
  });

  it("toggles a staple on then off, immutably", () => {
    const empty: Pantry = [];
    const added = toggleStaple(empty, "Mustard seeds");
    expect(added).toContain("mustard seeds");
    expect(empty).toEqual([]); // input not mutated
    const removed = toggleStaple(added, "mustard seeds");
    expect(removed).not.toContain("mustard seeds");
  });

  it("partitions a list into toBuy and staples", () => {
    const items = [{ name: "salt" }, { name: "rice" }, { name: "Oil" }];
    const { toBuy, staples } = partitionByPantry(items, ["salt", "oil"]);
    expect(staples.map((s) => s.name)).toEqual(["salt", "Oil"]);
    expect(toBuy.map((s) => s.name)).toEqual(["rice"]);
  });
});
