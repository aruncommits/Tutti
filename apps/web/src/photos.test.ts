import { describe, it, expect } from "vitest";
import { addPhoto, removePhoto, type Photos } from "./photos";

describe("photos store (Brief v33 item 1) — pure, capped", () => {
  it("sets and replaces a photo by recipe id", () => {
    let m: Photos = {};
    m = addPhoto(m, "r1", "data:a");
    expect(m.r1).toBe("data:a");
    m = addPhoto(m, "r1", "data:b");
    expect(m.r1).toBe("data:b");
    expect(Object.keys(m)).toHaveLength(1);
  });

  it("caps the store, dropping the oldest other entries and keeping the new one", () => {
    let m: Photos = {};
    for (let i = 0; i < 13; i++) m = addPhoto(m, `r${i}`, `d${i}`, 12);
    const keys = Object.keys(m);
    expect(keys).toHaveLength(12);
    expect(m.r12).toBe("d12"); // newest kept
    expect(m.r0).toBeUndefined(); // oldest dropped
  });

  it("removes a photo", () => {
    const m: Photos = { r1: "x", r2: "y" };
    expect(removePhoto(m, "r1")).toEqual({ r2: "y" });
  });

  it("does not mutate the input map", () => {
    const m: Photos = { r1: "x" };
    const snap = JSON.stringify(m);
    addPhoto(m, "r2", "y");
    removePhoto(m, "r1");
    expect(JSON.stringify(m)).toBe(snap);
  });
});
