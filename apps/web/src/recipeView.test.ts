import { describe, it, expect } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { orderedSteps, recipeIngredients, recipeTotalMins } from "./recipeView";

const rasam = goldenLibrary.find((r) => r.recipeId === "rec_rasam")!;

describe("recipeView (Brief v19 item 1)", () => {
  it("orders steps so each follows all of its dependencies", () => {
    const steps = orderedSteps(rasam);
    expect(steps).toHaveLength(rasam.nodes.length);
    const index = new Map(steps.map((n, i) => [n.nodeId, i]));
    for (const n of steps) {
      for (const dep of n.dependencies) {
        if (index.has(dep)) expect(index.get(dep)!).toBeLessThan(index.get(n.nodeId)!);
      }
    }
  });

  it("aggregates a non-empty ingredient list", () => {
    const ings = recipeIngredients(rasam);
    expect(ings.length).toBeGreaterThan(0);
    expect(ings.every((i) => typeof i.name === "string" && i.name.length > 0)).toBe(true);
    // tamarind has an amount; something marked to-taste flags toTaste
    expect(ings.some((i) => i.amount !== undefined)).toBe(true);
  });

  it("sums total minutes", () => {
    expect(recipeTotalMins(rasam)).toBe(rasam.nodes.reduce((s, n) => s + n.duration.estMins, 0));
    expect(recipeTotalMins(rasam)).toBeGreaterThan(0);
  });
});
