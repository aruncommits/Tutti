import { describe, it, expect } from "vitest";
import { draftFromText, PasteParser } from "../src/index";
import { validate } from "@tutti/engine";

const PASTED = `Lemon Rice

Ingredients:
- 2 cups cooked rice
- 2 tbsp oil
- 1 tsp mustard seeds
- 1 lemon, juiced
- salt to taste

Method:
1. Heat oil and add mustard seeds until they pop
2. Add the cooked rice and salt, stir well
3. Turn off heat, mix in the lemon juice
4. Garnish and serve`;

describe("draftFromText — pasted recipe (Brief v3 item 2)", () => {
  const g = draftFromText(PASTED);

  it("extracts the title", () => {
    expect(g.name).toBe("Lemon Rice");
  });

  it("splits ingredients from steps by section headers", () => {
    expect(g.nodes).toHaveLength(4); // 4 method steps
    expect(g.nodes[0]!.ingredients.length).toBe(5); // 5 ingredient lines
  });

  it("produces a valid, acyclic, unverified draft", () => {
    expect(validate(g).ok).toBe(true);
    expect(g.verified).toBe(false);
  });

  it("falls back to all-steps when there is no clear split", () => {
    const g2 = draftFromText("Boil water\nAdd pasta\nDrain and serve");
    expect(g2.nodes.length).toBe(3);
    expect(validate(g2).ok).toBe(true);
  });

  it("captures the base serving size from a 'Serves: N' line and keeps it out of ingredients/steps", () => {
    const g3 = draftFromText("Veg Biryani\nServes: 6\n\nIngredients:\n- 2 cups rice\n- 1 cup peas\n\nMethod:\n1. Cook the rice\n2. Mix and serve");
    expect(g3.servings).toBe(6);
    expect(g3.name).toBe("Veg Biryani");
    expect(g3.nodes).toHaveLength(2);
    expect(g3.nodes[0]!.ingredients.some((i) => /serv/i.test(i.name))).toBe(false);
  });

  it("defaults servings when the recipe doesn't state a yield, and keeps 'serve' steps", () => {
    expect(draftFromText("Boil water\nAdd pasta\nDrain and serve").servings).toBe(2);
  });
});

describe("PasteParser — RecipeParser contract", () => {
  it("returns a validated graph marked unverified", async () => {
    const r = await new PasteParser().parse({ source: "paste", text: PASTED });
    expect(r.validation.ok).toBe(true);
    expect(r.unverified).toBe(true);
    expect(r.graph!.nodes.length).toBeGreaterThan(0);
  });
});
