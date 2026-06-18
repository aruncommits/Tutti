import { describe, it, expect } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { toLibraryEntries, filterLibrary } from "./libraryView";

const entries = toLibraryEntries(goldenLibrary);
const names = (es: ReturnType<typeof toLibraryEntries>) => es.map((e) => e.recipe.name);

describe("toLibraryEntries (Brief v8 item 2)", () => {
  it("derives totalMins, allergens, and veg for each recipe", () => {
    const lemon = entries.find((e) => e.recipe.recipeId === "rec_lemonrice")!;
    expect(lemon.totalMins).toBeGreaterThan(0);
    expect(lemon.allergens).toContain("peanuts");
    expect(lemon.veg).toBe(true); // all seeded dishes are vegetarian
  });
});

describe("filterLibrary — stackable filters (Brief v8 item 2)", () => {
  it("returns all entries with no filters", () => {
    expect(filterLibrary(entries)).toHaveLength(entries.length);
  });

  it("searches by recipe name", () => {
    expect(names(filterLibrary(entries, { query: "rasam" }))).toContain("Tomato Rasam");
  });

  it("searches by an ingredient name not in the title", () => {
    // 'tamarind' appears only in ingredients (Rasam), not in any recipe name
    const hits = names(filterLibrary(entries, { query: "tamarind" }));
    expect(hits).toContain("Tomato Rasam");
    expect(hits).not.toContain("Curd Rice");
  });

  it("excludes recipes containing an avoided allergen", () => {
    const hits = names(filterLibrary(entries, { avoidAllergens: ["peanuts"] }));
    expect(hits).not.toContain("Lemon Rice"); // has peanuts
    expect(hits).toContain("Coconut Chutney");
  });

  it("stacks query + maxMins together", () => {
    const all = filterLibrary(entries, { query: "rice" }); // Curd Rice + Lemon Rice
    const quick = filterLibrary(entries, { query: "rice", maxMins: 20 });
    expect(quick.length).toBeLessThanOrEqual(all.length);
    for (const e of quick) expect(e.totalMins).toBeLessThanOrEqual(20);
  });

  it("vegOnly keeps every seeded dish (all vegetarian)", () => {
    expect(filterLibrary(entries, { vegOnly: true })).toHaveLength(entries.length);
  });
});

import { sortLibrary } from "./libraryView";

describe("sortLibrary (Brief v38 item 1)", () => {
  it("quickest orders ascending by total time", () => {
    const out = sortLibrary(entries, "quickest");
    for (let i = 1; i < out.length; i++) expect(out[i]!.totalMins).toBeGreaterThanOrEqual(out[i - 1]!.totalMins);
  });
  it("rated puts a high-rated recipe before an unrated one", () => {
    const id = entries[3]!.recipe.recipeId; // some middle recipe
    const out = sortLibrary(entries, "rated", { [id]: { rating: 5, cookCount: 0 } });
    expect(out[0]!.recipe.recipeId).toBe(id);
  });
  it("cooked puts the most-cooked first", () => {
    const id = entries[2]!.recipe.recipeId;
    const out = sortLibrary(entries, "cooked", { [id]: { rating: 0, cookCount: 9 } });
    expect(out[0]!.recipe.recipeId).toBe(id);
  });
  it("default keeps the original order", () => {
    expect(sortLibrary(entries, "default").map((e) => e.recipe.recipeId)).toEqual(entries.map((e) => e.recipe.recipeId));
  });
});

import { filterLibrary as _filterCuisine, cuisinesOf } from "./libraryView";

describe("filterLibrary cuisine (Brief v39)", () => {
  it("narrows to a single cuisine and ignores it when unset", () => {
    const cuisines = cuisinesOf(entries);
    expect(cuisines.length).toBeGreaterThan(1); // multi-cuisine library
    const c = cuisines[0]!;
    const only = _filterCuisine(entries, { cuisine: c });
    expect(only.length).toBeGreaterThan(0);
    expect(only.every((e) => e.recipe.cuisine === c)).toBe(true);
    expect(_filterCuisine(entries, {}).length).toBe(entries.length); // unset = all
  });
});
