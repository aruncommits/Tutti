import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary, type RecipeGraph } from "@tutti/engine";
import { StudioScreen } from "./StudioScreen";
import { isScreen } from "./validators";

const mine: RecipeGraph = { ...goldenLibrary[0]!, recipeId: "rec_mine", name: "My Pasta Bake", verified: false };

describe("studio screen persistence", () => {
  it("accepts 'studio' as a persisted screen (survives reload)", () => {
    expect(isScreen("studio")).toBe(true); // regression: must be in the validator allow-list
  });
});

describe("StudioScreen — My recipes (Brief v42)", () => {
  it("shows an empty state and the New-recipe action when there are no candidates", () => {
    render(<StudioScreen candidates={[]} onNew={vi.fn()} onOpen={vi.fn()} onDuplicate={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText(/no recipes yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new recipe/i })).toBeInTheDocument();
  });

  it("lists my recipes with open / duplicate / delete actions", () => {
    const onOpen = vi.fn();
    const onDuplicate = vi.fn();
    const onRemove = vi.fn();
    render(<StudioScreen candidates={[mine]} onNew={vi.fn()} onOpen={onOpen} onDuplicate={onDuplicate} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: /open my pasta bake/i }));
    expect(onOpen).toHaveBeenCalledWith(mine);

    fireEvent.click(screen.getByRole("button", { name: /duplicate my pasta bake/i }));
    expect(onDuplicate).toHaveBeenCalledWith("rec_mine");

    fireEvent.click(screen.getByRole("button", { name: /delete my pasta bake/i }));
    expect(onRemove).toHaveBeenCalledWith("rec_mine");
  });

  it("flags an unverified recipe", () => {
    render(<StudioScreen candidates={[mine]} onNew={vi.fn()} onOpen={vi.fn()} onDuplicate={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();
  });
});
