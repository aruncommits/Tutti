import { describe, it, expect } from "vitest";
import { readPersisted } from "./state";
import { isStringArray, isPlainObject, isMealArray, isScreen, isClock } from "./validators";

describe("readPersisted (Brief v23 item 1)", () => {
  it("returns initial for a missing key", () => {
    expect(readPersisted(null, ["a"])).toEqual(["a"]);
  });
  it("returns initial for unparseable JSON", () => {
    expect(readPersisted("{not json", 7)).toBe(7);
  });
  it("returns initial when the parsed value fails validation", () => {
    expect(readPersisted('{"a":1}', [], isStringArray)).toEqual([]); // object, not string[]
  });
  it("returns the parsed value when it passes validation", () => {
    expect(readPersisted('["x","y"]', [], isStringArray)).toEqual(["x", "y"]);
  });
  it("returns the parsed value with no validator", () => {
    expect(readPersisted('{"k":1}', {})).toEqual({ k: 1 });
  });
});

describe("validators (Brief v23 item 2)", () => {
  it("isStringArray", () => {
    expect(isStringArray(["a", "b"])).toBe(true);
    expect(isStringArray(["a", 1])).toBe(false);
    expect(isStringArray("a")).toBe(false);
  });
  it("isPlainObject", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
  });
  it("isMealArray rejects legacy meals missing dishIds", () => {
    expect(isMealArray([{ id: "m1", dishIds: ["a"] }])).toBe(true);
    expect(isMealArray([{ id: "x" }])).toBe(false); // the v22 crash shape
    expect(isMealArray([{ dishIds: ["a"] }])).toBe(false);
    expect(isMealArray("nope")).toBe(false);
  });
  it("isScreen", () => {
    expect(isScreen("home")).toBe(true);
    expect(isScreen("cook")).toBe(true);
    expect(isScreen("bogus")).toBe(false);
    expect(isScreen(3)).toBe(false);
  });
  it("isClock", () => {
    expect(isClock("19:30:00")).toBe(true);
    expect(isClock("9:05")).toBe(true);
    expect(isClock("nope")).toBe(false);
  });
});
