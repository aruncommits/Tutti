import { describe, it, expect } from "vitest";
import { factorForPeople, peopleFromFactor } from "./servings";

describe("factorForPeople (Brief v26 item 1)", () => {
  it("scales by desired ÷ base servings", () => {
    expect(factorForPeople(4, 8)).toBe(2);
    expect(factorForPeople(4, 4)).toBe(1);
    expect(factorForPeople(4, 12)).toBe(3);
  });
  it("never drops below 1 (cooking for fewer than the base)", () => {
    expect(factorForPeople(4, 2)).toBe(1);
    expect(factorForPeople(4, 1)).toBe(1);
  });
  it("clamps to a sane max of 6", () => {
    expect(factorForPeople(4, 100)).toBe(6);
  });
  it("guards a zero/garbage base servings", () => {
    expect(factorForPeople(0, 8)).toBe(6); // people/1 -> clamp
  });
});

describe("peopleFromFactor", () => {
  it("is the inverse for display", () => {
    expect(peopleFromFactor(4, 2)).toBe(8);
    expect(peopleFromFactor(4, 1)).toBe(4);
  });
});
