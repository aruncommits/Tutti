import { describe, it, expect } from "vitest";
import { goldenLibrary, complexityOf, validate } from "../src/index";

const byId = (id: string) => goldenLibrary.find((r) => r.recipeId === id)!;

describe("complexityOf", () => {
  it("classifies every golden recipe into a known tier", () => {
    for (const r of goldenLibrary) {
      const c = complexityOf(r);
      expect(["simple", "moderate", "complex"]).toContain(c.tier);
      expect(c.makespanMins).toBeGreaterThan(0);
    }
  });

  it("scores a one-pot variant below the everyday below the from-scratch (monotonic per dish)", () => {
    const simple = complexityOf(byId("rec_sambar_simple")).score;
    const moderate = complexityOf(byId("rec_sambar")).score;
    const complex = complexityOf(byId("rec_sambar_complex")).score;
    expect(simple).toBeLessThan(moderate);
    expect(moderate).toBeLessThan(complex);
  });

  it("lands the authored Sambar variants in their intended tiers", () => {
    expect(complexityOf(byId("rec_sambar_simple")).tier).toBe("simple");
    expect(complexityOf(byId("rec_sambar_complex")).tier).toBe("complex");
  });

  it("treats a free-handed (high passive) recipe as less complex than a hands-on one of similar length", () => {
    // Curd Rice is mostly a passive rice cook; Beetroot Poriyal is nearly all active sautéing.
    expect(complexityOf(byId("rec_curdrice")).score).toBeLessThan(complexityOf(byId("rec_beetroot")).score);
  });
});

describe("authored variants are valid graphs", () => {
  it("every new variant passes the engine validate() gate", () => {
    for (const id of ["rec_sambar_simple", "rec_sambar_complex", "rec_rasam_simple"]) {
      expect(validate(byId(id)).ok).toBe(true);
    }
  });
});
