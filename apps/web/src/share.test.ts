import { describe, it, expect, afterEach, vi } from "vitest";
import { formatShoppingList, formatPlan, shareOrCopy } from "./share";
import { compile, thaliV1 } from "@tutti/engine";

describe("formatters (Brief v16 item 1)", () => {
  it("formats a shopping list with quantities and to-taste", () => {
    const text = formatShoppingList([
      { name: "rice", amount: 2, unit: "cup" },
      { name: "salt", toTaste: true },
    ]);
    expect(text).toBe("Tutti — shopping list\n• 2 cup rice\n• to taste salt");
  });

  it("formats a plan line", () => {
    const plan = compile(thaliV1.recipes, thaliV1.kitchenProfile, "19:30:00");
    const text = formatPlan(plan, ["Rice", "Kuzhambu"]);
    expect(text).toMatch(/^Tutti plan — serving at 19:30, start \d\d:\d\d: Rice, Kuzhambu$/);
  });
});

describe("shareOrCopy branch selection (Brief v16 item 1)", () => {
  const orig = { share: (navigator as { share?: unknown }).share, clipboard: navigator.clipboard };
  const set = (k: "share" | "clipboard", v: unknown) =>
    Object.defineProperty(navigator, k, { value: v, configurable: true, writable: true });
  afterEach(() => {
    set("share", orig.share);
    set("clipboard", orig.clipboard);
  });

  it("returns 'shared' when navigator.share resolves", async () => {
    set("share", vi.fn().mockResolvedValue(undefined));
    expect(await shareOrCopy("t", "x")).toBe("shared");
  });

  it("treats an AbortError (user cancel) as shared", async () => {
    set("share", vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "AbortError" })));
    expect(await shareOrCopy("t", "x")).toBe("shared");
  });

  it("falls back to clipboard 'copied' when share is absent", async () => {
    set("share", undefined);
    set("clipboard", { writeText: vi.fn().mockResolvedValue(undefined) });
    expect(await shareOrCopy("t", "x")).toBe("copied");
  });

  it("returns 'failed' when neither share nor clipboard works", async () => {
    set("share", undefined);
    set("clipboard", undefined);
    expect(await shareOrCopy("t", "x")).toBe("failed");
  });
});
