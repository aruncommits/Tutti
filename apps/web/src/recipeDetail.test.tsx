import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { RecipeDetailScreen } from "./RecipeDetailScreen";

const rasam = goldenLibrary.find((r) => r.recipeId === "rec_rasam")!;

describe("RecipeDetailScreen (Brief v19 items 2+5)", () => {
  it("renders the recipe name, ingredients, and one step per node", () => {
    render(<RecipeDetailScreen recipe={rasam} onAdd={() => {}} onBack={() => {}} />);
    expect(screen.getByRole("heading", { level: 2, name: /tomato rasam/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ingredients/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /steps/i })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(rasam.nodes.length);
  });

  it("calls onAdd from 'Add to meal'", () => {
    const onAdd = vi.fn();
    render(<RecipeDetailScreen recipe={rasam} onAdd={onAdd} onBack={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /add to meal/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("shows an 'out of …' substitution hint for an ingredient with a curated swap", () => {
    render(<RecipeDetailScreen recipe={rasam} onAdd={() => {}} onBack={() => {}} />); // rasam uses ghee
    const hint = screen.getByText(/out of ghee\?/i);
    expect(hint).toBeInTheDocument();
    expect(hint.textContent).toMatch(/oil|butter/i);
    // water has no curated swap -> no hint for it
    expect(screen.queryByText(/out of water\?/i)).toBeNull();
  });

  it("shows a 'best for N+' minimum-batch suggestion only when it's below the base servings", () => {
    const base = { ...rasam, servings: 4 };
    const { rerender } = render(<RecipeDetailScreen recipe={{ ...base, minServings: 2 }} onAdd={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/best for 2\+/i)).toBeInTheDocument();
    // when the recommended minimum equals the base, no redundant hint
    rerender(<RecipeDetailScreen recipe={{ ...base, minServings: 4 }} onAdd={() => {}} onBack={() => {}} />);
    expect(screen.queryByText(/best for/i)).toBeNull();
  });

  it("shows a saved rating and note when present", () => {
    render(<RecipeDetailScreen recipe={rasam} note={{ rating: 4, cookCount: 2, note: "more pepper" }} onAdd={() => {}} onBack={() => {}} />);
    expect(screen.getByLabelText(/4 of 5 stars/i)).toBeInTheDocument();
    expect(screen.getByText(/cooked 2×/i)).toBeInTheDocument();
    expect(screen.getByText(/more pepper/i)).toBeInTheDocument();
  });
});
