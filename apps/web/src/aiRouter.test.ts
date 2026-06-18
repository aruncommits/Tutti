import { describe, it, expect, vi, afterEach } from "vitest";
import { routeRecipe, configuredProviders } from "../server/aiRouter";

// The router picks the best available provider per task and falls back across providers on error.
// We mock fetch so no real key/network is ever used.

afterEach(() => vi.unstubAllGlobals());

function mockFetch(handler: (url: string, init: RequestInit) => { ok: boolean; status?: number; json: unknown }) {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const r = handler(String(url), init);
    return { ok: r.ok, status: r.status ?? (r.ok ? 200 : 500), json: async () => r.json, text: async () => JSON.stringify(r.json) } as unknown as Response;
  }));
}

describe("AI router", () => {
  it("reports only the providers that have keys", () => {
    expect(configuredProviders({ openai: "x" })).toEqual(["openai"]);
    expect(configuredProviders({ openai: "x", google: "y" }).sort()).toEqual(["google", "openai"]);
    expect(configuredProviders({})).toEqual([]);
  });

  it("throws no-keys when nothing is configured", async () => {
    await expect(routeRecipe("anything", {})).rejects.toThrow(/no-keys/);
  });

  it("routes 'generate' to Anthropic (best-fit) when its key is present", async () => {
    const seen: string[] = [];
    mockFetch((url) => { seen.push(url); return { ok: true, json: { content: [{ type: "text", text: "Dal\n\nIngredients:\n- 1 cup dal\n\nMethod:\n1. Boil (20 min)" }] } }; });
    const r = await routeRecipe("a simple dal", { anthropic: "k" }, "generate");
    expect(r.provider).toBe("anthropic");
    expect(r.text).toMatch(/Ingredients:/);
    expect(seen[0]).toContain("api.anthropic.com");
  });

  it("falls back to the next provider when the first errors", async () => {
    mockFetch((url) => {
      if (url.includes("anthropic")) return { ok: false, status: 500, json: { error: "boom" } };
      if (url.includes("openai")) return { ok: true, json: { choices: [{ message: { content: "OpenAI recipe text" } }] } };
      return { ok: false, json: {} };
    });
    const r = await routeRecipe("dal", { anthropic: "k1", openai: "k2" }, "generate");
    expect(r.provider).toBe("openai");
    expect(r.text).toBe("OpenAI recipe text");
  });
});
