import { describe, it, expect } from "vitest";
import { compile, thaliV1, goldenLibrary, parseClock, type KitchenProfile, type RecipeGraph } from "../src/index";

// Locks Tutti's moat (Doc 2 §4): hands are a finite resource, so more cooks = more parallelism =
// a shorter meal. An AMPLE kitchen (plenty of burners/pans) ensures HANDS are the bottleneck.
const ample = (cooks: number): KitchenProfile => ({
  cooks,
  resources: [
    { category: "burner", count: 4 },
    { category: "pan", count: 4, capabilities: ["small", "large"] },
    { category: "pressure_cooker", count: 1 },
    { category: "cutting_board", count: 2 },
    { category: "blender", count: 1 },
  ],
});

const makespan = (recipes: RecipeGraph[], cooks: number) => {
  const p = compile(recipes, ample(cooks), "19:30:00");
  return { cpm: p.criticalPathMins, span: parseClock(p.projectedServeTime) - parseClock(p.startTime) };
};

describe("hands-as-a-resource parallelism (Brief v13 item 1)", () => {
  it("a second cook shortens a parallelizable meal — the thali", () => {
    const one = makespan(thaliV1.recipes, 1);
    const two = makespan(thaliV1.recipes, 2);
    expect(two.span).toBeLessThan(one.span);
    expect(two.span).toBeLessThanOrEqual(one.span);
  });

  it("two hands-on library dishes finish sooner with two cooks", () => {
    const dishes = goldenLibrary.filter((r) => ["rec_chutney", "rec_rasam"].includes(r.recipeId));
    const one = makespan(dishes, 1);
    const two = makespan(dishes, 2);
    expect(two.span).toBeLessThan(one.span);
  });

  it("more cooks never makes a meal slower (monotonic)", () => {
    const spans = [1, 2, 3, 4].map((c) => makespan(thaliV1.recipes, c).span);
    for (let i = 1; i < spans.length; i++) expect(spans[i]!).toBeLessThanOrEqual(spans[i - 1]!);
  });
});
