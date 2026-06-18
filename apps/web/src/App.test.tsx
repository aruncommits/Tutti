import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, expect } from "vitest";
import { compile, thaliV1 } from "@tutti/engine";
import { App } from "./App";

// Enforce-what-you-build a11y gate: the three-tier cook view must always expose NOW/NEXT/DONE
// as labelled regions with a labelled Done control, so screen readers can navigate it (Doc 7 §12).
// Tutti starts with an empty plan (no thali default), so we seed a real cook plan for this view.
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("tutti.onboarded", "true");
  localStorage.setItem("tutti.screen", '"cook"');
  localStorage.setItem("tutti.dishes", JSON.stringify(thaliV1.recipes.map((r) => r.recipeId)));
  localStorage.setItem("tutti.plan", JSON.stringify(compile(thaliV1.recipes, thaliV1.kitchenProfile, thaliV1.targetServeTime, {})));
});

describe("App — three-tier cook view accessibility", () => {
  it("renders NOW / NEXT / DONE as labelled regions", () => {
    render(<App />);
    expect(screen.getByRole("region", { name: /now/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /done/i })).toBeInTheDocument();
  });

  it("exposes at least one labelled Done control for the active task", () => {
    render(<App />);
    const doneButtons = screen.getAllByRole("button", { name: /done/i });
    expect(doneButtons.length).toBeGreaterThan(0);
  });

  it("shows the projected serve time", () => {
    render(<App />);
    expect(screen.getByText("Serving at")).toBeInTheDocument();
  });
});
