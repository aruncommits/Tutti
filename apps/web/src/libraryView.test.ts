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

describe("filterLibrary diets (Brief v47)", () => {
  it("keeps only recipes satisfying all required diets", () => {
    const vegan = filterLibrary(entries, { diets: ["vegan"] }).map((e) => e.recipe.recipeId);
    expect(vegan).toContain("rec_chutney"); // all-plant
    expect(vegan).not.toContain("rec_curdrice"); // has yogurt
  });
  it("annotates entries with diets and kcal", () => {
    const curd = entries.find((e) => e.recipe.recipeId === "rec_curdrice")!;
    expect(curd.diets).toContain("vegetarian");
    expect(curd.kcal).toBeGreaterThan(0);
  });
});

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

import { courseOf, groupByCuisine, pickHistory } from "./libraryView";

describe("courseOf — dish-type inference (Brief v41)", () => {
  const byId = (id: string) => entries.find((e) => e.recipe.recipeId === id)!.recipe;
  it("classifies rice, gravy, and chutney from the recipe name", () => {
    expect(courseOf(byId("rec_lemonrice"))).toBe("Rice");
    expect(courseOf(byId("rec_rasam"))).toBe("Gravies & curries"); // Tomato Rasam
    expect(courseOf(byId("rec_chutney"))).toBe("Chutneys & sauces");
  });
  it("falls back to 'Other dishes' for an unmatched name", () => {
    const fake = { ...byId("rec_lemonrice"), name: "Mystery Platter" };
    expect(courseOf(fake)).toBe("Other dishes");
  });
});

describe("groupByCuisine — cuisine → dish (Brief v41)", () => {
  it("groups by cuisine, largest first, and sub-groups a varied cuisine by course", () => {
    const groups = groupByCuisine(entries);
    expect(groups.length).toBe(cuisinesOf(entries).length);
    // largest cuisine first
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i - 1]!.entries.length).toBeGreaterThanOrEqual(groups[i]!.entries.length);
    }
    // the biggest cuisine (South Indian, 11 dishes) sub-groups by course
    const biggest = groups[0]!;
    expect(biggest.courses.length).toBeGreaterThanOrEqual(2);
    const inCourses = biggest.courses.reduce((n, c) => n + c.entries.length, 0);
    expect(inCourses).toBe(biggest.entries.length); // every dish lands in exactly one course
  });
  it("leaves a small cuisine flat (no course sub-groups)", () => {
    const groups = groupByCuisine(entries);
    const small = groups.find((g) => g.entries.length < 4);
    if (small) expect(small.courses).toHaveLength(0);
  });
});

describe("pickHistory — recents & frequent (Brief v41)", () => {
  it("orders recents by lastCookedAt and frequent by cookCount, history-only", () => {
    const a = entries[0]!.recipe.recipeId;
    const b = entries[1]!.recipe.recipeId;
    const c = entries[2]!.recipe.recipeId;
    const notes = {
      [a]: { cookCount: 2, lastCookedAt: 100 },
      [b]: { cookCount: 9, lastCookedAt: 300 },
      [c]: { cookCount: 5, lastCookedAt: 200 },
    };
    const { recents, frequent } = pickHistory(entries, notes);
    expect(recents.map((e) => e.recipe.recipeId)).toEqual([b, c, a]); // newest cooked first
    expect(frequent.map((e) => e.recipe.recipeId)).toEqual([b, c, a]); // most cooked first
    // dishes with no history are excluded from both
    expect(recents.length).toBe(3);
    expect(frequent.length).toBe(3);
  });
  it("returns empty lists when there is no cook history", () => {
    const { recents, frequent } = pickHistory(entries, {});
    expect(recents).toHaveLength(0);
    expect(frequent).toHaveLength(0);
  });
});
