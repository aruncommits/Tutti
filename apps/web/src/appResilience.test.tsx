import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { App } from "./App";

// Malformed / legacy persisted data must self-heal to defaults, never crash the app (Brief v23).
describe("App resilience to corrupt persisted data (Brief v23 item 5)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("tutti.onboarded", "true");
    localStorage.setItem("tutti.screen", '"bogus"');        // not a real screen
    localStorage.setItem("tutti.meals", '[{"id":"x"}]');     // legacy meal missing dishIds (the v22 crash)
    localStorage.setItem("tutti.dishes", '"notarray"');      // wrong type
    localStorage.setItem("tutti.pace", "[1,2]");             // array where an object is expected
    localStorage.setItem("tutti.recipeNotes", "42");         // not an object
  });

  it("renders Home without throwing despite garbage in every key", () => {
    expect(() => render(<App />)).not.toThrow();
    // bogus screen falls back to home (the meal-plan builder)
    expect(screen.getByRole("heading", { level: 2, name: /plan a meal/i })).toBeInTheDocument();
  });
});
