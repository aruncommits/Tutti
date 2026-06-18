import { describe, it, expect } from "vitest";
import { substitutesFor } from "./substitutions";

describe("substitutesFor (Brief v25 item 1)", () => {
  it("returns curated swaps for a known ingredient (case-insensitive)", () => {
    expect(substitutesFor("Ghee").length).toBeGreaterThan(0);
    expect(substitutesFor("ghee")[0]!.swap).toMatch(/oil|butter/i);
  });

  it("matches via the normalized name (strips prep adjectives)", () => {
    // "grated coconut" normalizes to "coconut" — the curated key
    expect(substitutesFor("grated coconut").length).toBeGreaterThan(0);
  });

  it("returns an empty list for an ingredient with no curated swap", () => {
    expect(substitutesFor("rice")).toEqual([]);
    expect(substitutesFor("water")).toEqual([]);
  });

  it("includes an honest 'omit' option where appropriate", () => {
    expect(substitutesFor("mustard seeds").some((s) => /omit/i.test(s.swap))).toBe(true);
  });
});
