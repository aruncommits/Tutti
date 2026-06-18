import { describe, it, expect } from "vitest";
import { setRating, setNote, recordCook, clearNote, type NotesMap } from "./recipeNotes";

describe("recipeNotes (Brief v17 item 1) — pure, immutable", () => {
  it("recordCook increments cookCount and stamps lastCookedAt", () => {
    let m: NotesMap = {};
    m = recordCook(m, "r1", 100);
    expect(m.r1).toEqual({ cookCount: 1, lastCookedAt: 100 });
    m = recordCook(m, "r1", 250);
    expect(m.r1!.cookCount).toBe(2);
    expect(m.r1!.lastCookedAt).toBe(250);
  });

  it("setRating clamps to 1..5 and clears on 0/undefined", () => {
    let m: NotesMap = {};
    m = setRating(m, "r1", 9);
    expect(m.r1!.rating).toBe(5);
    m = setRating(m, "r1", 4);
    expect(m.r1!.rating).toBe(4);
    m = setRating(m, "r1", 0);
    expect(m.r1).toBeUndefined(); // nothing left -> pruned
  });

  it("setNote trims and clears on empty", () => {
    let m: NotesMap = {};
    m = setNote(m, "r1", "  more tamarind  ");
    expect(m.r1!.note).toBe("more tamarind");
    m = setNote(m, "r1", "   ");
    expect(m.r1).toBeUndefined();
  });

  it("clearNote keeps cook history", () => {
    let m: NotesMap = {};
    m = recordCook(m, "r1", 100);
    m = setRating(m, "r1", 5);
    m = setNote(m, "r1", "great");
    m = clearNote(m, "r1");
    expect(m.r1).toEqual({ cookCount: 1, lastCookedAt: 100 });
  });

  it("never mutates the input map", () => {
    const m: NotesMap = { r1: { cookCount: 1 } };
    const snapshot = JSON.stringify(m);
    recordCook(m, "r1", 5);
    setRating(m, "r1", 3);
    setNote(m, "r1", "x");
    expect(JSON.stringify(m)).toBe(snapshot);
  });
});
