import { describe, it, expect } from "vitest";
import { MockParser, PasteParser, draftFromText, extractJsonLdRecipe } from "../src/index";
import { validate } from "@tutti/engine";

// Enforce-what-you-build: any parser output that claims validation.ok MUST pass the engine's
// validate() gate — a parser can never green-light a graph the runtime would reject.

const PASTE = "Dal\nIngredients:\n1 cup dal\nMethod:\nBoil for 15 min\nTemper and serve";
const JSONLD = `<script type="application/ld+json">{"@type":"Recipe","name":"Dal","recipeIngredient":["1 cup dal"],"recipeInstructions":"Boil 15 min. Serve."}</script>`;

describe("parser contract — ok output passes engine validate()", () => {
  it("MockParser", async () => {
    const r = await new MockParser().parse({ source: "paste", text: "Tomato Rice" });
    if (r.validation.ok) expect(validate(r.graph!).ok).toBe(true);
  });

  it("PasteParser", async () => {
    const r = await new PasteParser().parse({ source: "paste", text: PASTE });
    expect(r.validation.ok).toBe(true);
    expect(validate(r.graph!).ok).toBe(true);
  });

  it("draftFromText", () => {
    const g = draftFromText(PASTE);
    expect(validate(g).ok).toBe(true);
  });

  it("extractJsonLdRecipe", () => {
    const r = extractJsonLdRecipe(JSONLD);
    expect(r.found).toBe(true);
    expect(r.validation.ok).toBe(true);
    expect(validate(r.graph!).ok).toBe(true);
  });
});
