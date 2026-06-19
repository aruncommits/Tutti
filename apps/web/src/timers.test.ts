import { describe, it, expect } from "vitest";
import { createTimer, remainingSec, isRinging, addTimer, removeTimer, extendTimer, sortTimers } from "./timers";

const NOW = 1_000_000_000_000;

describe("timers (Brief v44)", () => {
  it("creates a timer that ends `minutes` from now", () => {
    const t = createTimer("Rice", 12, NOW, "a");
    expect(t.totalSec).toBe(720);
    expect(t.endsAt).toBe(NOW + 720_000);
    expect(remainingSec(t, NOW)).toBe(720);
  });

  it("counts down by wall clock and floors at zero", () => {
    const t = createTimer("Simmer", 1, NOW, "b");
    expect(remainingSec(t, NOW + 30_000)).toBe(30);
    expect(remainingSec(t, NOW + 90_000)).toBe(0);
    expect(isRinging(t, NOW + 90_000)).toBe(true);
  });

  it("labels a blank timer by its duration", () => {
    expect(createTimer("  ", 5, NOW, "c").label).toBe("5 min");
  });

  it("adds, removes, and sorts soonest-first", () => {
    let list = addTimer([], createTimer("Long", 20, NOW, "x"));
    list = addTimer(list, createTimer("Short", 3, NOW, "y"));
    expect(sortTimers(list).map((t) => t.id)).toEqual(["y", "x"]);
    expect(removeTimer(list, "x").map((t) => t.id)).toEqual(["y"]);
  });

  it("extends from now when already finished, else from end", () => {
    const t = createTimer("A", 1, NOW, "z");
    const list = [t];
    // not finished: +60s on top of remaining
    expect(remainingSec(extendTimer(list, "z", 60, NOW + 10_000)[0]!, NOW + 10_000)).toBe(110);
    // finished: +60s from now
    expect(remainingSec(extendTimer(list, "z", 60, NOW + 120_000)[0]!, NOW + 120_000)).toBe(60);
  });
});
