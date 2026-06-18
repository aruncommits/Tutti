import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { thaliV1 } from "@tutti/engine";
import { PickScreen } from "./PlanFlow";

const baseProps = () => ({
  recipes: thaliV1.recipes,
  selected: thaliV1.recipes.map((r) => r.recipeId),
  onToggle: vi.fn(),
  soloMins: 90,
  interleavedMins: 45,
  onAdd: vi.fn(),
  onShopping: vi.fn(),
  avoid: [] as string[],
  factorOf: () => 1,
  onSetFactor: vi.fn(),
  peopleTarget: 4,
  onPeople: vi.fn(),
  onNext: vi.fn(),
});

describe("PickScreen meal-level servings (Brief v26 items 2+5)", () => {
  it("shows the 'Cooking for N' stepper and steps it", () => {
    const p = baseProps();
    render(<PickScreen {...p} />);
    expect(screen.getByText(/cooking for/i)).toBeInTheDocument();
    expect(screen.getByText(/4 people/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /more people/i }));
    expect(p.onPeople).toHaveBeenCalledWith(5);
    fireEvent.click(screen.getByRole("button", { name: /fewer people/i }));
    expect(p.onPeople).toHaveBeenCalledWith(3);
  });

  it("omits the stepper when nothing is selected", () => {
    render(<PickScreen {...baseProps()} selected={[]} />);
    expect(screen.queryByText(/cooking for/i)).toBeNull();
  });
});
