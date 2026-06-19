import { describe, it, expect } from "vitest";
import { aisleOf, aisleOrder, AISLES } from "../src/index";

describe("aisleOf", () => {
  it("maps known ingredients to their aisle", () => {
    expect(aisleOf("tomato")).toBe("Produce");
    expect(aisleOf("toor dal")).toBe("Lentils & beans");
    expect(aisleOf("mustard seeds")).toBe("Spices");
    expect(aisleOf("coconut oil")).toBe("Oils & vinegars");
    expect(aisleOf("yogurt")).toBe("Dairy");
  });
  it("falls back to Other for unknown ingredients", () => {
    expect(aisleOf("moon dust")).toBe("Other");
  });
});

describe("aisleOrder", () => {
  it("orders Produce before Spices before Other (walk order)", () => {
    expect(aisleOrder("Produce")).toBeLessThan(aisleOrder("Spices"));
    expect(aisleOrder("Spices")).toBeLessThan(aisleOrder("Other"));
  });
  it("every canonical aisle has a finite order", () => {
    for (const a of AISLES) expect(Number.isFinite(aisleOrder(a))).toBe(true);
  });
});
