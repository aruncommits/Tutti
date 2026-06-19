import { describe, it, expect } from "vitest";
import { mealFit } from "./mealFit";

describe("mealFit — whole-meal feasibility dial (Brief v41)", () => {
  it("fits a reasonable ASAP meal", () => {
    const fit = mealFit(50, 1, null, true);
    expect(fit.verdict).toBe("fits");
    expect(fit.hint).toBe("");
  });

  it("flags 'over' when a serve time can't be met", () => {
    const fit = mealFit(90, 1, "19:00:00", false);
    expect(fit.verdict).toBe("over");
    expect(fit.hint).toMatch(/simpler tiers/i);
  });

  it("flags 'tight' for a long single-cook meal", () => {
    expect(mealFit(80, 1, null, true).verdict).toBe("tight");
    expect(mealFit(80, 2, null, true).verdict).toBe("fits"); // extra hands relieve it
  });

  it("a short single-cook meal fits", () => {
    expect(mealFit(45, 1, null, true).verdict).toBe("fits");
  });
});
