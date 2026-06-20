import { describe, it, expect } from "vitest";
import { parseIngredient } from "../src/draft";
import { draftFromText } from "../src/index";

describe("parseIngredient — hardened quantity parsing", () => {
  it("parses a plain amount + unit", () => {
    expect(parseIngredient("700g boneless chicken thighs")).toEqual({ name: "boneless chicken thighs", amount: 700, unit: "g" });
  });
  it("parses a decimal", () => {
    expect(parseIngredient("2.5 cups flour")).toEqual({ name: "flour", amount: 2.5, unit: "cups" });
  });
  it("parses a simple fraction", () => {
    expect(parseIngredient("1/2 tsp salt")).toEqual({ name: "salt", amount: 0.5, unit: "tsp" });
  });
  it("parses a mixed number", () => {
    expect(parseIngredient("1 1/2 cups rice")).toEqual({ name: "rice", amount: 1.5, unit: "cups" });
  });
  it("parses a bare unicode fraction", () => {
    expect(parseIngredient("½ cup sugar")).toEqual({ name: "sugar", amount: 0.5, unit: "cup" });
  });
  it("parses an integer + attached unicode fraction", () => {
    expect(parseIngredient("2¾ cups water")).toEqual({ name: "water", amount: 2.75, unit: "cups" });
  });
  it("parses a hyphen range as the midpoint", () => {
    expect(parseIngredient("2-3 cups stock")).toEqual({ name: "stock", amount: 2.5, unit: "cups" });
  });
  it("parses a 'to' range", () => {
    expect(parseIngredient("2 to 4 tbsp oil")).toEqual({ name: "oil", amount: 3, unit: "tbsp" });
  });
  it("strips a leading 'about/roughly/~' qualifier", () => {
    expect(parseIngredient("about 200g paneer")).toEqual({ name: "paneer", amount: 200, unit: "g" });
    expect(parseIngredient("~1 cup peas")).toEqual({ name: "peas", amount: 1, unit: "cup" });
  });
  it("handles a unitless count", () => {
    expect(parseIngredient("3 onions, sliced")).toEqual({ name: "onions, sliced", amount: 3, unit: undefined });
  });
  it("falls back to the raw string when there is no quantity", () => {
    expect(parseIngredient("salt to taste")).toEqual({ name: "salt to taste" });
  });
});

describe("draftFromText — serving inference when no yield is stated", () => {
  it("infers a sensible base from the ingredients when 'Serves:' is absent", () => {
    const g = draftFromText(
      "Chicken Curry\n\nIngredients:\n- 800g chicken\n- 400g onions\n- 400g tomatoes\n- 200g yogurt\n\nMethod:\n1. Cook everything\n2. Serve",
    );
    expect(g.servings).toBeGreaterThanOrEqual(4); // not the old hard default of 2
    expect(g.servingsSource).toBe("inferred");
  });
  it("trusts an explicit 'Serves:' and does not override it", () => {
    const g = draftFromText("Veg Biryani\nServes: 6\n\nIngredients:\n- 2 cups rice\n- 1 cup peas\n\nMethod:\n1. Cook\n2. Serve");
    expect(g.servings).toBe(6);
    expect(g.servingsSource).toBeUndefined();
  });
});
