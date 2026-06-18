import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { thaliV1, goldenLibrary } from "@tutti/engine";
import { ShoppingScreen } from "./ShoppingScreen";
import { RecipeDetailScreen } from "./RecipeDetailScreen";

const orig = window.print;
afterEach(() => { window.print = orig; });

describe("Print buttons (Brief v31 items 2+5)", () => {
  it("ShoppingScreen Print button calls window.print()", () => {
    window.print = vi.fn();
    render(<ShoppingScreen recipes={thaliV1.recipes} onBack={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /print/i }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("RecipeDetail Print button calls window.print()", () => {
    window.print = vi.fn();
    render(<RecipeDetailScreen recipe={goldenLibrary[0]!} onAdd={() => {}} onBack={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /print/i }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
