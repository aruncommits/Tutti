import { describe, it, expect } from "vitest";
import { MockParser } from "../src/index";

describe("RecipeParser contract — MockParser", () => {
  it("produces a schema-valid, acyclic RecipeGraph from pasted text", async () => {
    const r = await new MockParser().parse({ source: "paste", text: "Tomato Rice\nboil rice\nfry spices" });
    expect(r.validation.ok).toBe(true);
    expect(r.graph).not.toBeNull();
    expect(r.graph!.nodes.length).toBeGreaterThan(0);
  });

  it("marks user-parsed recipes unverified (Doc 5 §7)", async () => {
    const r = await new MockParser().parse({ source: "ai", text: "a quick dal" });
    expect(r.unverified).toBe(true);
  });
});
