import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { RecipeDetailScreen } from "./RecipeDetailScreen";

const recipe = goldenLibrary[0]!;
const DATA = "data:image/jpeg;base64,/9j/abc";

describe("dish photo thumbnail (Brief v33 items 3+5)", () => {
  it("renders the saved photo in the recipe header", () => {
    render(<RecipeDetailScreen recipe={recipe} photo={DATA} onAdd={vi.fn()} onBack={vi.fn()} />);
    const img = screen.getByRole("img", { name: new RegExp(`your ${recipe.name}`, "i") });
    expect(img).toHaveAttribute("src", DATA);
  });

  it("renders no dish-thumb image when there is no photo", () => {
    const { container } = render(<RecipeDetailScreen recipe={recipe} onAdd={vi.fn()} onBack={vi.fn()} />);
    expect(container.querySelector("img.dish-thumb")).toBeNull();
  });
});
