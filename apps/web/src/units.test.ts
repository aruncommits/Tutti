import { describe, it, expect } from "vitest";
import { convertAmount, displayAmount } from "./units";

describe("convertAmount (Brief v29 item 1)", () => {
  it("converts US volumes to ml when metric is on", () => {
    expect(convertAmount(1, "cup", true)).toEqual({ amount: 240, unit: "ml" });
    expect(convertAmount(1, "tbsp", true)).toEqual({ amount: 15, unit: "ml" });
    expect(convertAmount(2, "tsp", true)).toEqual({ amount: 10, unit: "ml" });
    expect(convertAmount(0.5, "cup", true)).toEqual({ amount: 120, unit: "ml" });
  });
  it("converts ounces to grams", () => {
    expect(convertAmount(2, "oz", true)).toEqual({ amount: 55, unit: "g" }); // 56 -> nearest 5
  });
  it("is identity when metric is off", () => {
    expect(convertAmount(1, "cup", false)).toEqual({ amount: 1, unit: "cup" });
  });
  it("leaves count/unknown units unchanged", () => {
    expect(convertAmount(2, "whole", true)).toEqual({ amount: 2, unit: "whole" });
    expect(convertAmount(3, "clove", true)).toEqual({ amount: 3, unit: "clove" });
  });
  it("passes through a missing amount", () => {
    expect(convertAmount(undefined, "cup", true)).toEqual({ amount: undefined, unit: "cup" });
  });
});

describe("displayAmount", () => {
  it("formats converted amounts and to-taste", () => {
    expect(displayAmount(1, "cup", false, true)).toBe("240 ml");
    expect(displayAmount(1, "cup", false, false)).toBe("1 cup");
    expect(displayAmount(undefined, undefined, true, true)).toBe("to taste");
    expect(displayAmount(undefined, undefined, false, true)).toBe("");
  });
});
