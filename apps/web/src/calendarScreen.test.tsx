import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CalendarScreen } from "./CalendarScreen";
import { assignMeal, plannedFromSaved, type Calendar } from "./calendar";
import type { SavedMeal } from "./meals";

const TODAY = "2026-06-18";
const saved: SavedMeal = { id: "s1", name: "South Indian Thali", dishIds: ["rec_sambar", "rec_lemonrice"], servings: {}, target: "19:00:00", savedAt: 0, kind: "saved" };

const baseProps = {
  meals: [saved],
  today: TODAY,
  onAssign: vi.fn(),
  onClear: vi.fn(),
  onCook: vi.fn(),
  onShopWeek: vi.fn(),
};

describe("CalendarScreen (Brief v45)", () => {
  it("renders a 7-day week and shops the whole week", () => {
    const onShopWeek = vi.fn();
    render(<CalendarScreen {...baseProps} calendar={{}} onShopWeek={onShopWeek} />);
    expect(screen.getAllByRole("button", { name: /add a meal to/i })).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: /shopping list for the whole week/i }));
    expect(onShopWeek).toHaveBeenCalledTimes(1);
    expect(onShopWeek.mock.calls[0]![0]).toHaveLength(7);
  });

  it("assigns a saved meal to a day via the add panel", () => {
    const onAssign = vi.fn();
    render(<CalendarScreen {...baseProps} calendar={{}} onAssign={onAssign} />);
    fireEvent.click(screen.getAllByRole("button", { name: /add a meal to/i })[0]!);
    fireEvent.click(screen.getByRole("button", { name: /plan south indian thali/i }));
    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(onAssign.mock.calls[0]![1]).toBe("dinner"); // default slot
    expect(onAssign.mock.calls[0]![2].name).toBe("South Indian Thali");
  });

  it("cooks a planned meal", () => {
    const cal: Calendar = assignMeal({}, TODAY, "dinner", plannedFromSaved(saved, "p1"));
    const onCook = vi.fn();
    render(<CalendarScreen {...baseProps} calendar={cal} onCook={onCook} />);
    fireEvent.click(screen.getByRole("button", { name: /cook south indian thali/i }));
    expect(onCook).toHaveBeenCalledTimes(1);
    expect(onCook.mock.calls[0]![0].dishIds).toEqual(["rec_sambar", "rec_lemonrice"]);
  });
});
