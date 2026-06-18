import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { RecipeDetailScreen } from "./RecipeDetailScreen";

// Curd rice uses "1 cup rice" + "0.25 cup milk" — good for checking the metric display swap.
const curdRice = goldenLibrary.find((r) => r.recipeId === "rec_curdrice")!;

describe("Metric units at display (Brief v29 items 3+5)", () => {
  it("shows ml for cup-based amounts when metric is on", () => {
    render(<RecipeDetailScreen recipe={curdRice} metric onAdd={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getAllByText(/\bml\b/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\bcup\b/i)).toBeNull(); // converted away
  });

  it("keeps the original units when metric is off (default)", () => {
    render(<RecipeDetailScreen recipe={curdRice} onAdd={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getAllByText(/cup/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\bml\b/i)).toBeNull();
  });
});
