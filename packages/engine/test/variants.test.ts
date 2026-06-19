import { describe, it, expect } from "vitest";
import { goldenLibrary, groupVariants, variantsForDish, dishIdOf, tierOf } from "../src/index";

const sambars = goldenLibrary.filter((r) => dishIdOf(r) === "dish_sambar");

describe("dishIdOf / tierOf", () => {
  it("defaults dishId to recipeId when no group is set", () => {
    const single = goldenLibrary.find((r) => r.recipeId === "rec_curdrice")!;
    expect(dishIdOf(single)).toBe("rec_curdrice");
  });
  it("uses the authored tier when present and derives otherwise", () => {
    expect(tierOf(goldenLibrary.find((r) => r.recipeId === "rec_sambar")!)).toBe("moderate");
    // rec_curdrice has no authored tier ⇒ derived, still a valid tier
    expect(["simple", "moderate", "complex"]).toContain(tierOf(goldenLibrary.find((r) => r.recipeId === "rec_curdrice")!));
  });
});

describe("groupVariants", () => {
  it("collapses variants of one dish into a single group", () => {
    const groups = groupVariants(goldenLibrary);
    const sambar = groups.find((g) => g.dishId === "dish_sambar")!;
    expect(sambar.variants).toHaveLength(3);
    expect(sambar.name).toBe("Sambar"); // the default's name
  });

  it("elects the verified moderate as the default", () => {
    const groups = groupVariants(goldenLibrary);
    expect(groups.find((g) => g.dishId === "dish_sambar")!.defaultRecipe.recipeId).toBe("rec_sambar");
  });

  it("orders variants simple → moderate → complex", () => {
    const groups = groupVariants(goldenLibrary);
    const order = groups.find((g) => g.dishId === "dish_sambar")!.variants.map((r) => tierOf(r));
    expect(order).toEqual(["simple", "moderate", "complex"]);
  });

  it("flags a group with an unverified member", () => {
    const mine = { ...goldenLibrary[0]!, recipeId: "rec_mine", dishId: "dish_sambar", tier: "complex" as const, verified: false };
    const groups = groupVariants([...goldenLibrary, mine]);
    expect(groups.find((g) => g.dishId === "dish_sambar")!.hasUnverified).toBe(true);
    // …but the verified recipe still wins the default slot
    expect(groups.find((g) => g.dishId === "dish_sambar")!.defaultRecipe.verified).toBe(true);
  });

  it("yields one group per distinct dish (single-recipe dishes included)", () => {
    const dishCount = new Set(goldenLibrary.map(dishIdOf)).size;
    expect(groupVariants(goldenLibrary)).toHaveLength(dishCount);
  });
});

describe("variantsForDish", () => {
  it("returns all variants of a dish, tier-ordered", () => {
    expect(variantsForDish(goldenLibrary, "dish_sambar").map((r) => r.recipeId)).toEqual([
      "rec_sambar_simple",
      "rec_sambar",
      "rec_sambar_complex",
    ]);
    expect(sambars).toHaveLength(3);
  });
});
