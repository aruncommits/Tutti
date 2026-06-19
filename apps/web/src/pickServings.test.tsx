import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { Builder } from "./Builder";
import type { MealFit } from "./mealFit";

const two = goldenLibrary.filter((r) => ["rec_sambar", "rec_curdrice"].includes(r.recipeId));

const baseProps = (onPeople: () => void) => ({
  selected: two,
  factorOf: () => 1,
  onSetFactor: vi.fn(),
  onRemove: vi.fn(),
  peopleTarget: 4,
  onPeople,
  serveAt: null,
  onServeAt: vi.fn(),
  soloMins: 90,
  interleavedMins: 45,
  feasible: true,
  earliestServe: "19:00:00",
  onBuild: vi.fn(),
  onPaste: vi.fn(),
  onAskAI: vi.fn(),
  library: goldenLibrary,
  candidates: [],
  notes: {},
  photos: {},
  avoid: [] as string[],
  selectedIds: two.map((r) => r.recipeId),
  onPick: vi.fn(),
  onDetails: vi.fn(),
  onSetTier: vi.fn(),
  onShopping: vi.fn(),
  diets: [],
  cookLive: false,
  fit: { makespanMins: 45, feasible: true, verdict: "fits", hint: "" } as MealFit,
});

// Meal-level servings stepper, now on the Builder (was PickScreen) — Brief v26 items 2+5.
describe("Builder meal-level servings", () => {
  it("shows the 'Cooking for N' stepper for a multi-dish plan and steps it", () => {
    const onPeople = vi.fn();
    render(<Builder {...baseProps(onPeople)} />);
    expect(screen.getByText(/cooking for/i)).toBeInTheDocument();
    expect(screen.getByText(/4 people/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /more people/i }));
    expect(onPeople).toHaveBeenCalledWith(5);
    fireEvent.click(screen.getByRole("button", { name: /fewer people/i }));
    expect(onPeople).toHaveBeenCalledWith(3);
  });

  it("omits the stepper for a single dish", () => {
    render(<Builder {...baseProps(vi.fn())} selected={[two[0]!]} selectedIds={[two[0]!.recipeId]} />);
    expect(screen.queryByText(/cooking for/i)).toBeNull();
  });
});
