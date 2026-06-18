import { describe, it, expect } from "vitest";
import { addSaved, addRecent, removeMeal, sameDishSet, type SavedMeal } from "./meals";

const meal = (id: string, dishIds: string[], kind: SavedMeal["kind"] = "recent", savedAt = 0): SavedMeal => ({
  id, name: id, dishIds, servings: {}, target: "19:30:00", savedAt, kind,
});

describe("sameDishSet", () => {
  it("is order-independent and length-sensitive", () => {
    expect(sameDishSet(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameDishSet(["a"], ["a", "b"])).toBe(false);
    expect(sameDishSet(["a", "b"], ["a", "c"])).toBe(false);
  });
});

describe("addRecent (Brief v12 item 1)", () => {
  it("prepends the newest cook", () => {
    let list: SavedMeal[] = [];
    list = addRecent(list, meal("m1", ["a"]));
    list = addRecent(list, meal("m2", ["b"]));
    expect(list.map((m) => m.id)).toEqual(["m2", "m1"]);
  });

  it("collapses an earlier cook of the same dish-set, moving it to front", () => {
    let list: SavedMeal[] = [];
    list = addRecent(list, meal("m1", ["a", "b"]));
    list = addRecent(list, meal("m2", ["c"]));
    list = addRecent(list, meal("m3", ["b", "a"])); // same set as m1, different order
    expect(list.map((m) => m.id)).toEqual(["m3", "m2"]); // m1 dropped, m3 at front
    expect(list).toHaveLength(2);
  });

  it("caps to the most recent N", () => {
    let list: SavedMeal[] = [];
    for (let i = 0; i < 14; i++) list = addRecent(list, meal(`m${i}`, [`d${i}`]), 10);
    expect(list).toHaveLength(10);
    expect(list[0]!.id).toBe("m13");
  });

  it("leaves saved meals untouched", () => {
    let list: SavedMeal[] = [meal("s1", ["a"], "saved")];
    list = addRecent(list, meal("r1", ["a"])); // same dishes, but s1 is saved -> kept
    expect(list.map((m) => m.id).sort()).toEqual(["r1", "s1"]);
  });
});

describe("addSaved / removeMeal", () => {
  it("replaces by id and keeps newest first", () => {
    let list: SavedMeal[] = [];
    list = addSaved(list, meal("s1", ["a"], "saved"));
    list = addSaved(list, meal("s1", ["a", "b"], "saved")); // same id -> replace
    expect(list).toHaveLength(1);
    expect(list[0]!.dishIds).toEqual(["a", "b"]);
  });

  it("removes by id", () => {
    const list: SavedMeal[] = [meal("a", ["x"]), meal("b", ["y"])];
    expect(removeMeal(list, "a").map((m) => m.id)).toEqual(["b"]);
  });
});
