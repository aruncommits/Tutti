import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ingredientKind, highlightIngredients } from "./ingredientColor";

describe("ingredientKind — color categories", () => {
  it.each([
    ["tomato", "fresh"], ["onion", "fresh"], ["ginger", "fresh"], ["curry leaves", "fresh"],
    ["turmeric", "spice"], ["red chili powder", "spice"], ["mustard seeds", "spice"], ["salt", "spice"],
    ["ghee", "fat"], ["butter", "fat"], ["water", "fat"], ["coconut oil", "fat"],
    ["paneer", "dairy"], ["milk", "dairy"], ["yogurt", "dairy"],
    ["chicken", "protein"], ["egg", "protein"], ["fish", "protein"],
    ["basmati rice", "grain"], ["atta", "grain"], ["bread", "grain"],
    ["toor dal", "legume"], ["chickpeas", "legume"],
    ["cashews", "nut"], ["sesame seeds", "nut"],
    ["sugar", "sweet"], ["jaggery", "sweet"], ["honey", "sweet"],
    // name-based fallback (spelling variants / compounds the reference misses)
    ["chillies", "fresh"], ["kashmiri chilli powder", "spice"], ["garam masala powder", "spice"],
  ])("%s → %s", (name, kind) => {
    expect(ingredientKind(name)).toBe(kind);
  });
});

describe("highlightIngredients", () => {
  it("wraps known ingredient names (incl. plurals) in colored spans", () => {
    const { container } = render(<div>{highlightIngredients("Heat ghee and fry the onions until golden")}</div>);
    const texts = [...container.querySelectorAll(".ing-hl")].map((s) => s.textContent);
    expect(texts).toContain("ghee");
    expect(texts).toContain("onions"); // plural matched
    const ghee = [...container.querySelectorAll<HTMLElement>(".ing-hl")].find((s) => s.textContent === "ghee")!;
    expect(ghee.style.color).toBeTruthy(); // a kind color is applied
  });

  it("leaves non-ingredient words untouched", () => {
    const { container } = render(<div>{highlightIngredients("Stir well and simmer until thick")}</div>);
    expect(container.querySelectorAll(".ing-hl").length).toBe(0);
  });
});
