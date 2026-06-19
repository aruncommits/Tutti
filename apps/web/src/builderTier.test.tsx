import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { Builder } from "./Builder";
import type { MealFit } from "./mealFit";

const sambar = goldenLibrary.find((r) => r.recipeId === "rec_sambar")!;
const curd = goldenLibrary.find((r) => r.recipeId === "rec_curdrice")!;

const baseProps = {
  factorOf: () => 1,
  onSetFactor: vi.fn(),
  onRemove: vi.fn(),
  peopleTarget: 4,
  onPeople: vi.fn(),
  serveAt: null,
  onServeAt: vi.fn(),
  soloMins: 60,
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
  avoid: [],
  selectedIds: [] as string[],
  onPick: vi.fn(),
  onDetails: vi.fn(),
  onSetTier: vi.fn(),
  onShopping: vi.fn(),
  diets: [],
  cookLive: false,
  fit: { makespanMins: 45, feasible: true, verdict: "fits", hint: "" } as MealFit,
};

describe("Builder — per-dish tier toggle (Brief v41)", () => {
  it("shows a simple/standard/elaborate toggle for a dish that has variants", () => {
    render(<Builder {...baseProps} selected={[sambar]} selectedIds={["rec_sambar"]} />);
    const group = within(screen.getByRole("group", { name: /how involved — sambar/i }));
    expect(group.getByRole("button", { name: "Simple" })).toBeInTheDocument();
    expect(group.getByRole("button", { name: "Standard" })).toHaveAttribute("aria-pressed", "true");
    expect(group.getByRole("button", { name: "Elaborate" })).toBeInTheDocument();
  });

  it("calls onSetTier with the dish and chosen tier", () => {
    const onSetTier = vi.fn();
    render(<Builder {...baseProps} selected={[sambar]} selectedIds={["rec_sambar"]} onSetTier={onSetTier} />);
    fireEvent.click(screen.getByRole("button", { name: "Elaborate" }));
    expect(onSetTier).toHaveBeenCalledWith("dish_sambar", "complex");
  });

  it("shows no tier toggle for a single-variant dish", () => {
    render(<Builder {...baseProps} selected={[curd]} selectedIds={["rec_curdrice"]} />);
    expect(screen.queryByRole("group", { name: /how involved/i })).toBeNull();
  });

  it("guards rebuild while a cook is live — two taps to discard", () => {
    const onBuild = vi.fn();
    render(<Builder {...baseProps} selected={[sambar]} selectedIds={["rec_sambar"]} cookLive onBuild={onBuild} />);
    fireEvent.click(screen.getByRole("button", { name: /build plan/i })); // first tap arms
    expect(onBuild).not.toHaveBeenCalled();
    expect(screen.getByText(/still cooking/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /discard cook & build/i })); // confirm
    expect(onBuild).toHaveBeenCalledTimes(1);
  });

  it("surfaces the meal-fit nudge only when the meal is tight or over", () => {
    const { rerender } = render(<Builder {...baseProps} selected={[sambar]} selectedIds={["rec_sambar"]} />);
    expect(screen.queryByText(/lot for one cook/i)).toBeNull();
    rerender(
      <Builder
        {...baseProps}
        selected={[sambar]}
        selectedIds={["rec_sambar"]}
        fit={{ makespanMins: 95, feasible: true, verdict: "tight", hint: "That's a lot for one cook — simpler tiers will get it done sooner." }}
      />,
    );
    expect(screen.getByText(/lot for one cook/i)).toBeInTheDocument();
  });
});
