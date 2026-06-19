import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { App } from "./App";

// The home screen is the meal-plan builder (de-thali): a brand-new user starts with an EMPTY
// plan and clear ways to add any recipe — never a pre-loaded thali.
describe("Home meal-plan builder", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("tutti.onboarded", "true");
    localStorage.setItem("tutti.screen", '"home"');
  });

  it("starts a brand-new user with an empty plan and ways to add recipes", async () => {
    render(<App />);
    // Builder is lazy-loaded (Suspense) — await it.
    expect(await screen.findByRole("heading", { level: 2, name: /plan a meal/i }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/your meal plan is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /find recipes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /paste a recipe/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ask ai/i })).toBeInTheDocument();
  });

  it("does not pre-load the South Indian thali example", async () => {
    render(<App />);
    await screen.findByRole("heading", { level: 2, name: /plan a meal/i }, { timeout: 3000 });
    expect(screen.queryByText(/south indian thali/i)).toBeNull();
  });
});
