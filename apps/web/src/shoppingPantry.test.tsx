import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { thaliV1 } from "@tutti/engine";
import { ShoppingScreen } from "./ShoppingScreen";

describe("ShoppingScreen pantry staples (Brief v21 items 2+5)", () => {
  it("has an always-have toggle per item that reports the ingredient name", () => {
    const onToggleStaple = vi.fn();
    render(<ShoppingScreen recipes={thaliV1.recipes} pantry={[]} onToggleStaple={onToggleStaple} onBack={() => {}} />);
    const toggles = screen.getAllByRole("button", { name: /always-have/i });
    expect(toggles.length).toBeGreaterThan(0);
    fireEvent.click(toggles[0]!);
    expect(onToggleStaple).toHaveBeenCalledTimes(1);
    expect(typeof onToggleStaple.mock.calls[0]![0]).toBe("string");
  });

  it("separates staples into an 'In your pantry' group", () => {
    // mark 'rice' (a thali ingredient) as a pantry staple
    render(<ShoppingScreen recipes={thaliV1.recipes} pantry={["rice"]} onToggleStaple={() => {}} onBack={() => {}} />);
    expect(screen.getByRole("heading", { name: /in your pantry/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^to buy/i })).toBeInTheDocument();
  });
});
