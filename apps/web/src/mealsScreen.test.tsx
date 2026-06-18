import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { thaliV1 } from "@tutti/engine";
import { MealsScreen } from "./MealsScreen";
import type { SavedMeal } from "./meals";

const meal: SavedMeal = {
  id: "m1", name: "Sunday thali", dishIds: thaliV1.recipes.map((r) => r.recipeId),
  servings: {}, target: "19:30:00", savedAt: 0, kind: "saved",
};

describe("MealsScreen (Brief v12 item 5)", () => {
  it("lists a saved meal and restores it on tap", () => {
    const onRestore = vi.fn();
    render(<MealsScreen meals={[meal]} recipes={thaliV1.recipes} onRestore={onRestore} onRemove={() => {}} onBack={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /cook sunday thali again/i }));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore.mock.calls[0]![0].id).toBe("m1");
  });

  it("removes a meal via the × control", () => {
    const onRemove = vi.fn();
    render(<MealsScreen meals={[meal]} recipes={thaliV1.recipes} onRestore={() => {}} onRemove={onRemove} onBack={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /remove sunday thali/i }));
    expect(onRemove).toHaveBeenCalledWith("m1");
  });

  it("shows an empty state when there are no meals", () => {
    render(<MealsScreen meals={[]} recipes={thaliV1.recipes} onRestore={() => {}} onRemove={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/no saved meals yet/i)).toBeInTheDocument();
  });
});
