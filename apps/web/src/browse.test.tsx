import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowseScreen } from "./BrowseScreen";

describe("BrowseScreen (Brief v8 items 3-5)", () => {
  it("renders seeded library dishes and narrows on search", () => {
    render(<BrowseScreen avoid={[]} onPick={() => {}} onBack={() => {}} />);
    expect(screen.getByRole("button", { name: /add coconut chutney/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add tomato rasam/i })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /search recipes/i }), { target: { value: "rasam" } });
    expect(screen.getByRole("button", { name: /add tomato rasam/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add coconut chutney/i })).toBeNull();
  });

  it("calls onPick with the recipe when a row is tapped", () => {
    const onPick = vi.fn();
    render(<BrowseScreen avoid={[]} onPick={onPick} onBack={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /add curd rice/i }));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]![0].recipeId).toBe("rec_curdrice");
  });
});
