import { describe, it, expect } from "vitest";
import { scaleRecipe, validate, thaliV1 } from "../src/index";
import type { RecipeGraph } from "../src/index";

const rice = thaliV1.recipes.find((r) => r.recipeId === "rec_rice")!;
const kuzhambu = thaliV1.recipes.find((r) => r.recipeId === "rec_kuzhambu")!;

const amount = (g: RecipeGraph, nodeId: string, name: string) =>
  g.nodes.find((n) => n.nodeId === nodeId)!.ingredients.find((i) => i.name.includes(name))!.amount!;

describe("scaleRecipe (Brief v4 item 1 / Doc 6)", () => {
  it("is the identity at factor 1", () => {
    expect(scaleRecipe(rice, 1)).toBe(rice);
  });

  it("doubles a plain ingredient at factor 2", () => {
    const x2 = scaleRecipe(rice, 2);
    expect(amount(x2, "ri_2", "rinsed rice")).toBe(3); // 1.5 -> 3
    expect(amount(x2, "ri_2", "water")).toBe(6); // 3 -> 6
    expect(x2.servings).toBe(8); // 4 -> 8
  });

  it("scales seasoning conservatively (salt < linear) and flags the node", () => {
    const x2 = scaleRecipe(kuzhambu, 2);
    const salt = amount(x2, "kz_5", "salt"); // base 1 tsp
    expect(salt).toBeGreaterThan(1);
    expect(salt).toBeLessThan(2); // not fully linear
    expect(x2.nodes.find((n) => n.nodeId === "kz_5")!.scaleNote).toMatch(/adjust to taste/);
  });

  it("keeps the graph valid after scaling", () => {
    expect(validate(scaleRecipe(kuzhambu, 3)).ok).toBe(true);
    expect(validate(scaleRecipe(rice, 0.5)).ok).toBe(true);
  });

  it("does not mutate the input graph", () => {
    const snapshot = JSON.stringify(kuzhambu);
    scaleRecipe(kuzhambu, 2);
    expect(JSON.stringify(kuzhambu)).toBe(snapshot);
  });
});
