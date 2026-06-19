import { describe, it, expect } from "vitest";
import { goldenLibrary, dietsOf, satisfiesDiets } from "../src/index";
import type { RecipeGraph } from "../src/index";

const byId = (id: string) => goldenLibrary.find((r) => r.recipeId === id)!;

describe("dietsOf", () => {
  it("marks an all-plant dish vegan & vegetarian & dairy-free", () => {
    const d = dietsOf(byId("rec_chutney")); // coconut, dals, chili, oil, mustard…
    expect(d).toContain("vegetarian");
    expect(d).toContain("vegan");
    expect(d).toContain("dairy-free");
    expect(d).toContain("gluten-free");
  });

  it("marks a yogurt dish vegetarian but NOT vegan or dairy-free", () => {
    const d = dietsOf(byId("rec_curdrice")); // has yogurt + milk
    expect(d).toContain("vegetarian");
    expect(d).not.toContain("vegan");
    expect(d).not.toContain("dairy-free");
  });

  it("excludes meat dishes from vegetarian", () => {
    const base = byId("rec_chutney");
    const meaty: RecipeGraph = {
      ...base,
      recipeId: "rec_meat",
      nodes: base.nodes.map((n, i) => (i === 0 ? { ...n, ingredients: [{ name: "chicken", amount: 200, unit: "g" }] } : n)),
    };
    const d = dietsOf(meaty);
    expect(d).not.toContain("vegetarian");
    expect(d).not.toContain("vegan");
    expect(d).not.toContain("pescatarian"); // chicken is land-animal meat
  });

  it("honors authored diets verbatim", () => {
    const base = byId("rec_curdrice");
    const authored: RecipeGraph = { ...base, diets: ["vegan", "gluten-free"] };
    expect(dietsOf(authored).sort()).toEqual(["gluten-free", "vegan"]);
  });
});

describe("satisfiesDiets", () => {
  it("passes when the recipe meets all required diets", () => {
    expect(satisfiesDiets(byId("rec_chutney"), ["vegan", "gluten-free"])).toBe(true);
    expect(satisfiesDiets(byId("rec_curdrice"), ["vegan"])).toBe(false);
    expect(satisfiesDiets(byId("rec_chutney"), [])).toBe(true); // no requirement = always
  });
});
