import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { App } from "./App";

describe("Home suggestion card (Brief v18 items 2-3+5)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("tutti.onboarded", "true");
    localStorage.setItem("tutti.screen", '"home"');
  });

  it("suggests a starter meal for a brand-new user", () => {
    render(<App />);
    expect(screen.getByText(/tonight\?/i)).toBeInTheDocument();
    expect(screen.getByText(/a great first meal to try/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cook this/i })).toBeInTheDocument();
  });

  it("suggests a highly-rated saved meal and 'Cook this' opens it in Pick", async () => {
    localStorage.setItem(
      "tutti.meals",
      JSON.stringify([
        { id: "m1", name: "Sunday Feast", dishIds: ["rec_rice"], servings: {}, target: "19:30:00", savedAt: 1, kind: "saved" },
      ]),
    );
    localStorage.setItem("tutti.recipeNotes", JSON.stringify({ rec_rice: { rating: 5, cookCount: 2 } }));
    render(<App />);
    expect(screen.getByText("Sunday Feast")).toBeInTheDocument();
    expect(screen.getByText(/rated this highly/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cook this/i }));
    // Pick is lazy-loaded (Brief v34) — await it through Suspense
    expect(await screen.findByRole("heading", { level: 2, name: /pick your dishes/i }, { timeout: 3000 })).toBeInTheDocument();
  });
});
