import { describe, it, expect } from "vitest";
import { fetchRecipeFromUrl, htmlToText } from "../src/index";

const stubFetch = (html: string): typeof fetch =>
  (async () => ({ text: async () => html }) as Response) as unknown as typeof fetch;

const JSONLD_PAGE = `<html><head><script type="application/ld+json">
{"@type":"Recipe","name":"Online Dal","recipeIngredient":["1 cup dal"],
 "recipeInstructions":[{"@type":"HowToStep","text":"Boil the dal for 15 minutes"},{"@type":"HowToStep","text":"Temper and serve"}]}
</script></head><body>x</body></html>`;

const PLAIN_PAGE = `<html><body><h1>Quick Toast</h1><ul><li>2 slices bread</li><li>butter</li></ul>
<ol><li>Toast the bread</li><li>Spread butter and serve</li></ol></body></html>`;

describe("fetchRecipeFromUrl — Find online pipeline (Brief v3 item 4)", () => {
  it("prefers schema.org JSON-LD when present", async () => {
    const r = await fetchRecipeFromUrl("https://example.com/dal", { fetchImpl: stubFetch(JSONLD_PAGE) });
    expect(r.graph!.name).toBe("Online Dal");
    expect(r.validation.ok).toBe(true);
    expect(r.notes[0]).toMatch(/json-ld/);
  });

  it("falls back to a heuristic text parse when there is no JSON-LD", async () => {
    const r = await fetchRecipeFromUrl("https://example.com/toast", { fetchImpl: stubFetch(PLAIN_PAGE) });
    expect(r.validation.ok).toBe(true);
    expect(r.graph!.nodes.length).toBeGreaterThan(0);
    expect(r.notes[0]).toMatch(/text fallback/);
  });

  it("uses the injected AI fallback when provided and no JSON-LD is found", async () => {
    let called = false;
    const r = await fetchRecipeFromUrl("https://example.com/toast", {
      fetchImpl: stubFetch(PLAIN_PAGE),
      aiParse: async (text) => { called = true; expect(text).toContain("Toast"); return { graph: null, validation: { ok: true, errors: [], warnings: [] }, unverified: true, notes: ["stub-ai"] }; },
    });
    expect(called).toBe(true);
    expect(r.notes.some((n) => n.includes("ai from"))).toBe(true);
  });
});

describe("htmlToText", () => {
  it("strips tags and scripts to readable text", () => {
    const t = htmlToText("<div>Hello <script>bad()</script><b>world</b></div>");
    expect(t).toContain("Hello");
    expect(t).toContain("world");
    expect(t).not.toContain("bad()");
  });
});
