import { describe, it, expect } from "vitest";
import {
  CATEGORIES,
  categoryOf,
  toSummary,
  toDishSummaries,
  totalMinsOf,
  goldenLibrary,
  type Category,
  type RecipeGraph,
} from "../src/index";

// A minimal valid recipe for synthetic taxonomy tests (one prep node — enough for summaries).
function recipe(over: Partial<RecipeGraph> & { recipeId: string; name: string }): RecipeGraph {
  return {
    version: 1,
    servings: 4,
    verified: true,
    nodes: [
      {
        nodeId: `${over.recipeId}_1`,
        recipeId: over.recipeId,
        title: "Cook it",
        phase: "cook",
        attention: "active",
        duration: { estMins: 10, minMins: 8, maxMins: 12, elastic: true },
        ingredients: [],
        resources: [],
        dependencies: [],
      },
    ],
    ...over,
  };
}

describe("categoryOf — authored wins, else inferred from the name", () => {
  it("uses an authored category verbatim when it's in the vocabulary", () => {
    const r = recipe({ recipeId: "r1", name: "Something Unguessable", category: "Desserts" });
    expect(categoryOf(r)).toBe("Desserts");
  });

  it("ignores an authored category that isn't in the vocabulary and falls back to inference", () => {
    const r = recipe({ recipeId: "r2", name: "Hyderabadi Biryani", category: "NotARealCategory" });
    expect(categoryOf(r)).toBe("Biryani & Pulao");
  });

  it("infers from the name with sensible precedence", () => {
    const cases: [string, Category][] = [
      ["Hyderabadi Dum Biryani", "Biryani & Pulao"],
      ["Veg Pulao", "Biryani & Pulao"],
      ["Aglio e Olio Spaghetti", "Pasta & Noodles"],
      ["Hakka Noodles", "Pasta & Noodles"],
      ["Margherita Pizza", "Pizza"],
      ["Masala Chai", "Drinks"], // chai beats "masala"→curry
      ["Mango Lassi", "Drinks"],
      ["Rice Kheer", "Desserts"], // kheer beats "rice"→Rice
      ["Gajar Halwa", "Desserts"],
      ["Masala Dosa", "Breakfast & Tiffin"], // dosa beats "masala"
      ["Masala Omelette", "Breakfast & Tiffin"],
      ["Butter Naan", "Breads"],
      ["Dal Tadka", "Dal & Lentils"],
      ["Rajma Masala", "Dal & Lentils"], // rajma beats "masala"
      ["Tomato Rasam", "Dal & Lentils"],
      ["Jeera Rice", "Rice"],
      ["Paneer Butter Masala", "Curries & Gravies"],
      ["Tomato Soup", "Soups & Stews"],
      ["Cucumber Raita", "Salads"],
      ["Veg Samosa", "Snacks & Starters"],
      ["Coconut Chutney", "Chutneys & Sauces"],
      ["Banana Oatmeal", "Breakfast & Tiffin"],
      ["Guacamole", "Chutneys & Sauces"],
      // Global cuisines (Tacos & Wraps / Grills & Kebabs / Mains + tikka-masala guard).
      ["Chicken Shawarma", "Grills & Kebabs"],
      ["Chicken Tikka", "Grills & Kebabs"],
      ["Tandoori Chicken", "Grills & Kebabs"],
      ["Paneer Tikka Masala", "Curries & Gravies"], // "tikka masala" stays a curry, not a grill
      ["Carne Asada Tacos", "Tacos & Wraps"],
      ["Chicken Burrito", "Tacos & Wraps"],
      ["Chicken Parmigiana", "Mains"],
      ["Moussaka", "Mains"],
      ["Mushroom Risotto", "Rice"],
      ["Greek Salad", "Salads"],
      ["Tiramisu", "Desserts"],
      ["Hummus", "Chutneys & Sauces"],
    ];
    for (const [name, cat] of cases) {
      expect(categoryOf(recipe({ recipeId: name, name })), name).toBe(cat);
    }
  });

  it("falls back to 'Other' when nothing matches", () => {
    expect(categoryOf(recipe({ recipeId: "x", name: "Zorblax Surprise" }))).toBe("Other");
  });

  it("every inferred category is part of the published vocabulary", () => {
    for (const r of goldenLibrary as RecipeGraph[]) {
      expect(CATEGORIES as readonly string[]).toContain(categoryOf(r));
    }
  });
});

describe("toSummary — list-friendly projection", () => {
  it("derives the card fields without the task graph", () => {
    const r = goldenLibrary[0] as RecipeGraph;
    const s = toSummary(r);
    expect(s.recipeId).toBe(r.recipeId);
    expect(s.name).toBe(r.name);
    expect((CATEGORIES as readonly string[])).toContain(s.category);
    expect(s.totalMins).toBe(totalMinsOf(r));
    expect(s.totalMins).toBeGreaterThan(0);
    expect(s.kcal).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(s.diets)).toBe(true);
    expect(Array.isArray(s.allergens)).toBe(true);
    expect(s).not.toHaveProperty("nodes");
  });
});

describe("toDishSummaries — one card per dish, variants collapsed", () => {
  it("collapses a dish's tier variants into a single card with ordered tiers", () => {
    const recipes: RecipeGraph[] = [
      recipe({ recipeId: "bir_complex", name: "Hyderabadi Biryani", dishId: "dish_hyd_biryani", tier: "complex" }),
      recipe({ recipeId: "bir_simple", name: "Hyderabadi Biryani (quick)", dishId: "dish_hyd_biryani", tier: "simple" }),
      recipe({ recipeId: "bir_mod", name: "Hyderabadi Biryani (everyday)", dishId: "dish_hyd_biryani", tier: "moderate", verified: true }),
      recipe({ recipeId: "rasam", name: "Tomato Rasam" }), // its own dish, no dishId
    ];
    const dishes = toDishSummaries(recipes);
    expect(dishes).toHaveLength(2); // one biryani dish (3 variants) + one rasam

    const biryani = dishes.find((d) => d.dishId === "dish_hyd_biryani")!;
    expect(biryani.tiers.map((t) => t.tier)).toEqual(["simple", "moderate", "complex"]);
    expect(biryani.category).toBe("Biryani & Pulao");
    expect(biryani.defaultRecipeId).toBe("bir_mod"); // elected: verified moderate

    const rasam = dishes.find((d) => d.dishId === "rasam")!;
    expect(rasam.tiers).toHaveLength(1);
  });

  it("produces no more dish cards than there are recipes for the golden library", () => {
    const dishes = toDishSummaries(goldenLibrary as RecipeGraph[]);
    expect(dishes.length).toBeGreaterThan(0);
    expect(dishes.length).toBeLessThanOrEqual((goldenLibrary as RecipeGraph[]).length);
  });
});
