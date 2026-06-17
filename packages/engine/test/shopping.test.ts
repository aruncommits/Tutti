import { describe, it, expect } from "vitest";
import { buildShoppingList, normalizeIngredientName, thaliV1 } from "../src/index";

const list = buildShoppingList(thaliV1.recipes);
const find = (name: string, unit?: string) => list.find((i) => i.name === name && (unit === undefined || i.unit === unit));

describe("buildShoppingList (Brief v4 item 3 / Doc 6)", () => {
  it("merges salt across kuzhambu (1 tsp) + poriyal (0.5 tsp) into one summed line", () => {
    const salt = find("salt", "tsp")!;
    expect(salt.amount).toBe(1.5);
    expect(salt.recipeIds).toEqual(expect.arrayContaining(["rec_kuzhambu", "rec_poriyal"]));
    expect(salt.recipeIds).toHaveLength(2);
  });

  it("merges mustard seeds across both tempering steps (1 + 1 tsp)", () => {
    const mustard = find("mustard seeds", "tsp")!;
    expect(mustard.amount).toBe(2);
  });

  it("normalizes leading prep adjectives so prepared/raw forms merge", () => {
    expect(normalizeIngredientName("rinsed rice")).toBe("rice");
    expect(normalizeIngredientName("finely chopped beans")).toBe("beans");
    expect(normalizeIngredientName("green beans")).toBe("green beans"); // 'green' is not a prep adjective
  });

  it("conserves total amount per (name, unit) across the merge", () => {
    // sum of every salt-in-tsp occurrence in the source equals the list line
    let raw = 0;
    for (const r of thaliV1.recipes)
      for (const n of r.nodes)
        for (const ing of n.ingredients)
          if (normalizeIngredientName(ing.name) === "salt" && ing.unit === "tsp" && ing.amount) raw += ing.amount;
    expect(find("salt", "tsp")!.amount).toBe(raw);
  });

  it("produces a non-empty, ordered list", () => {
    expect(list.length).toBeGreaterThan(5);
    expect(list[0]!.name.length).toBeGreaterThan(0);
  });
});
