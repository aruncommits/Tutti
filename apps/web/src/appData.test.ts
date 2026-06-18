import { describe, it, expect } from "vitest";
import { tuttiKeys, exportData, resetData } from "./appData";

// A minimal in-memory Storage-like fake over a Map.
function fakeStore(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    get length() { return m.size; },
    key(i: number) { return [...m.keys()][i] ?? null; },
    getItem(k: string) { return m.has(k) ? m.get(k)! : null; },
    removeItem(k: string) { m.delete(k); },
    _map: m,
  };
}

describe("appData (Brief v22 item 1)", () => {
  it("lists only tutti.* keys", () => {
    const s = fakeStore({ "tutti.pace": "{}", "tutti.meals": "[]", "other.thing": "x" });
    expect(tuttiKeys(s)).toEqual(["tutti.meals", "tutti.pace"]);
  });

  it("exports tutti data as parseable JSON, ignoring other keys", () => {
    const s = fakeStore({ "tutti.dishes": '["a","b"]', "tutti.pro": "true", "session.token": "secret" });
    const json = JSON.parse(exportData(s));
    expect(json["tutti.dishes"]).toEqual(["a", "b"]);
    expect(json["tutti.pro"]).toBe(true);
    expect(json["session.token"]).toBeUndefined();
  });

  it("keeps a non-JSON value as a raw string", () => {
    const s = fakeStore({ "tutti.note": "plain text" });
    expect(JSON.parse(exportData(s))["tutti.note"]).toBe("plain text");
  });

  it("resets only tutti.* keys and returns them", () => {
    const s = fakeStore({ "tutti.pace": "{}", "tutti.meals": "[]", "other.keep": "y" });
    const removed = resetData(s);
    expect(removed).toEqual(["tutti.meals", "tutti.pace"]);
    expect(s.getItem("tutti.pace")).toBeNull();
    expect(s.getItem("other.keep")).toBe("y");
    expect(s.length).toBe(1);
  });
});
