import { describe, it, expect } from "vitest";
import { detectAllergens, allergensOf, ALLERGENS, thaliV1 } from "../src/index";
import type { RecipeGraph } from "../src/index";

const kuzhambu = thaliV1.recipes.find((r) => r.recipeId === "rec_kuzhambu")!;
const poriyal = thaliV1.recipes.find((r) => r.recipeId === "rec_poriyal")!;

describe("detectAllergens (Brief v4 item 5 / Doc 6)", () => {
  it("flags sesame + mustard in Vatha Kuzhambu (sesame oil, mustard seeds)", () => {
    expect(detectAllergens(kuzhambu)).toEqual(["mustard", "sesame"]);
  });

  it("flags mustard in Beans Poriyal but NOT nuts from coconut", () => {
    const a = detectAllergens(poriyal);
    expect(a).toContain("mustard");
    expect(a).not.toContain("nuts"); // 'coconut' must not trip the \bnut\b rule
  });

  it("only ever returns tags from the 14-allergen vocabulary", () => {
    for (const r of thaliV1.recipes) for (const tag of detectAllergens(r)) expect(ALLERGENS).toContain(tag);
  });

  it("allergensOf prefers explicit tags over the heuristic", () => {
    const tagged: RecipeGraph = { ...poriyal, allergens: ["peanuts"] };
    expect(allergensOf(tagged)).toEqual(["peanuts"]);
    expect(allergensOf(poriyal)).toEqual(detectAllergens(poriyal));
  });

  it("detects common keywords", () => {
    const g = (name: string): RecipeGraph => ({
      recipeId: "x", name: "x", version: 1, servings: 1, verified: false,
      nodes: [{ nodeId: "n", recipeId: "x", title: "t", phase: "prep", attention: "active",
        duration: { estMins: 1, minMins: 1, maxMins: 1, elastic: false },
        ingredients: [{ name }], resources: [], dependencies: [] }],
    });
    expect(detectAllergens(g("wheat flour"))).toContain("gluten");
    expect(detectAllergens(g("paneer cubes"))).toContain("milk");
    expect(detectAllergens(g("roasted peanuts"))).toContain("peanuts");
    expect(detectAllergens(g("cashew paste"))).toContain("nuts");
    expect(detectAllergens(g("coconut milk"))).not.toContain("nuts");
  });
});
