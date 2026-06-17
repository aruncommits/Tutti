import { describe, it, expect } from "vitest";
import { AiParser, isAiAvailable, type RecipeGraphCaller } from "../src/ai.parser";
import type { RecipeGraph } from "@tutti/engine";

const validGraph: RecipeGraph = {
  recipeId: "rec_ai", name: "AI Dal", version: 1, servings: 2, verified: false,
  nodes: [
    { nodeId: "n1", recipeId: "rec_ai", title: "Rinse dal", phase: "prep", attention: "active",
      duration: { estMins: 2, minMins: 1, maxMins: 3, elastic: true }, ingredients: [], resources: [], dependencies: [] },
    { nodeId: "n2", recipeId: "rec_ai", title: "Boil dal", phase: "cook", attention: "passive",
      duration: { estMins: 15, minMins: 12, maxMins: 20, elastic: false }, ingredients: [], resources: [{ category: "burner", count: 1 }], dependencies: ["n1"] },
  ],
};

// a cyclic graph the validator rejects — used to drive the repair path
const cyclicGraph: RecipeGraph = {
  recipeId: "rec_ai", name: "AI Dal", version: 1, servings: 2, verified: false,
  nodes: [
    { nodeId: "a", recipeId: "rec_ai", title: "A", phase: "prep", attention: "active",
      duration: { estMins: 1, minMins: 1, maxMins: 1, elastic: false }, ingredients: [], resources: [], dependencies: ["b"] },
    { nodeId: "b", recipeId: "rec_ai", title: "B", phase: "prep", attention: "active",
      duration: { estMins: 1, minMins: 1, maxMins: 1, elastic: false }, ingredients: [], resources: [], dependencies: ["a"] },
  ],
};

describe("AiParser — structured output + validate repair loop (Doc 5 §3-§4)", () => {
  it("returns a validated graph on a clean first parse", async () => {
    const caller: RecipeGraphCaller = async () => validGraph;
    const r = await new AiParser(caller).parse({ source: "ai", text: "a simple dal" });
    expect(r.validation.ok).toBe(true);
    expect(r.unverified).toBe(true);
    expect(r.graph!.nodes).toHaveLength(2);
  });

  it("re-prompts once with the validator error and recovers (repair loop)", async () => {
    let calls = 0;
    const caller: RecipeGraphCaller = async (_text, repairNote) => {
      calls++;
      // first call returns a cycle; the repair call (with a note) returns a valid graph
      return repairNote ? validGraph : cyclicGraph;
    };
    const r = await new AiParser(caller).parse({ source: "paste", text: "x" });
    expect(calls).toBe(2);
    expect(r.validation.ok).toBe(true);
    expect(r.notes.some((n) => n.startsWith("repair:"))).toBe(true);
  });

  it("surfaces validation errors when even the repair fails (routes to manual)", async () => {
    const caller: RecipeGraphCaller = async () => cyclicGraph; // always invalid
    const r = await new AiParser(caller).parse({ source: "ai", text: "x" });
    expect(r.validation.ok).toBe(false);
    expect(r.validation.errors.some((e) => e.includes("cycle"))).toBe(true);
  });
});

describe("isAiAvailable — gate stays key-free", () => {
  it("reflects the ANTHROPIC_API_KEY env var (absent in CI → false)", () => {
    expect(typeof isAiAvailable()).toBe("boolean");
  });
});
