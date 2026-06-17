import { describe, it, expect } from "vitest";
import { extractJsonLdRecipe, buildDraftGraph } from "../src/index";
import { validate } from "@tutti/engine";

const HTML = `<!doctype html><html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Recipe","name":"Tomato Rice",
 "recipeIngredient":["2 cups rice","1 tbsp oil","3 tomatoes, chopped","1 tsp salt"],
 "recipeInstructions":[
   {"@type":"HowToStep","text":"Chop the tomatoes finely"},
   {"@type":"HowToStep","text":"Heat oil and saute the tomatoes for 5 minutes"},
   {"@type":"HowToStep","text":"Add rice and water, simmer for 20 minutes"},
   {"@type":"HowToStep","text":"Garnish and serve"}
 ]}
</script></head><body>...</body></html>`;

describe("extractJsonLdRecipe — schema.org Recipe (Brief v3 item 1)", () => {
  const r = extractJsonLdRecipe(HTML);

  it("finds the Recipe and maps name + instructions to nodes", () => {
    expect(r.found).toBe(true);
    expect(r.graph!.name).toBe("Tomato Rice");
    expect(r.graph!.nodes).toHaveLength(4);
  });

  it("produces a schema-valid, acyclic draft graph", () => {
    expect(r.validation.ok).toBe(true);
    expect(validate(r.graph!).ok).toBe(true);
  });

  it("tags heat/rest steps sensibly and is unverified", () => {
    const simmer = r.graph!.nodes.find((n) => /simmer/i.test(n.title))!;
    expect(simmer.attention).toBe("passive");
    expect(simmer.phase).toBe("cook");
    expect(r.graph!.verified).toBe(false);
  });

  it("attaches parsed ingredients to the first node", () => {
    expect(r.graph!.nodes[0]!.ingredients.length).toBe(4);
    expect(r.graph!.nodes[0]!.ingredients.some((i) => i.name.includes("rice") && i.amount === 2)).toBe(true);
  });

  it("returns found=false when there is no Recipe JSON-LD", () => {
    expect(extractJsonLdRecipe("<html><body>no recipe here</body></html>").found).toBe(false);
  });

  it("handles @graph wrapping", () => {
    const wrapped = `<script type="application/ld+json">{"@context":"x","@graph":[{"@type":"WebPage"},{"@type":"Recipe","name":"Dal","recipeIngredient":["1 cup dal"],"recipeInstructions":"Boil the dal for 15 minutes. Temper and serve."}]}</script>`;
    const g = extractJsonLdRecipe(wrapped);
    expect(g.found).toBe(true);
    expect(g.graph!.name).toBe("Dal");
    expect(g.graph!.nodes.length).toBeGreaterThanOrEqual(2);
  });
});

describe("buildDraftGraph — safe linear chain", () => {
  it("chains steps sequentially (no invented parallelism)", () => {
    const g = buildDraftGraph("rec_x", "X", ["1 cup water"], ["Boil water", "Add tea", "Serve"]);
    expect(g.nodes[1]!.dependencies).toEqual(["rec_x_1"]);
    expect(validate(g).ok).toBe(true);
  });
});
