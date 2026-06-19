import { describe, it, expect } from "vitest";
import { addCollection, renameCollection, removeCollection, toggleInCollection, collectionsOf, isValidCollections, type Collection } from "./collections";

describe("collections (Brief v47)", () => {
  it("adds, renames, and removes a collection", () => {
    let list = addCollection([], "Weeknight", "c1");
    expect(list[0]).toMatchObject({ id: "c1", name: "Weeknight", recipeIds: [] });
    list = addCollection(list, "  ", "c2"); // blank ignored
    expect(list).toHaveLength(1);
    list = renameCollection(list, "c1", "Quick dinners");
    expect(list[0]!.name).toBe("Quick dinners");
    expect(removeCollection(list, "c1")).toEqual([]);
  });

  it("toggles a recipe in and out of a collection", () => {
    let list = addCollection([], "Festive", "c1");
    list = toggleInCollection(list, "c1", "rec_sambar");
    expect(list[0]!.recipeIds).toEqual(["rec_sambar"]);
    expect(collectionsOf(list, "rec_sambar").map((c) => c.id)).toEqual(["c1"]);
    list = toggleInCollection(list, "c1", "rec_sambar");
    expect(list[0]!.recipeIds).toEqual([]);
  });

  it("validates the persisted shape", () => {
    expect(isValidCollections([{ id: "c1", name: "x", recipeIds: [] }])).toBe(true);
    expect(isValidCollections([{ id: "c1" }])).toBe(false);
    expect(isValidCollections("nope")).toBe(false);
  });
});
