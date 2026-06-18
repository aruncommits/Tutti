import { describe, it, expect } from "vitest";
import { extendRemaining } from "./timer";

describe("extendRemaining (Brief v24 item 1)", () => {
  it("adds seconds immutably", () => {
    const r = { a: 120, b: 30 };
    const next = extendRemaining(r, "a", 60);
    expect(next.a).toBe(180);
    expect(next.b).toBe(30);
    expect(r.a).toBe(120); // input unchanged
  });

  it("seeds from 0 when the id is absent", () => {
    expect(extendRemaining({}, "x", 60)).toEqual({ x: 60 });
  });

  it("floors at 0 when the delta would go negative", () => {
    expect(extendRemaining({ a: 30 }, "a", -120).a).toBe(0);
  });

  it("only touches the target id", () => {
    const r = { a: 10, b: 20 };
    const next = extendRemaining(r, "a", 300);
    expect(next).toEqual({ a: 310, b: 20 });
  });
});
