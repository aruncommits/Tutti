import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { RecipePicker } from "./RecipePicker";

// South-Indian-dominant subset so the default-open accordion shows these dishes deterministically.
// (Browse's inline discovery lives in RecipePicker — the Builder uses it inline, BrowseScreen at scale.)
const LIB = goldenLibrary.filter((r) => ["rec_chutney", "rec_rasam", "rec_curdrice", "rec_lemonrice", "rec_beetroot", "rec_sambar", "rec_aglio"].includes(r.recipeId));

describe("RecipePicker discovery (Brief v8 items 3-5)", () => {
  it("renders seeded library dishes and narrows on search", () => {
    render(<RecipePicker avoid={[]} library={LIB} onPick={() => {}} />);
    expect(screen.getByRole("button", { name: /add coconut chutney/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add tomato rasam/i })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /search recipes/i }), { target: { value: "rasam" } });
    expect(screen.getByRole("button", { name: /add tomato rasam/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add coconut chutney/i })).toBeNull();
  });

  it("calls onPick with the recipe when a row is tapped", () => {
    const onPick = vi.fn();
    render(<RecipePicker avoid={[]} library={LIB} onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: /add curd rice/i }));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]![0].recipeId).toBe("rec_curdrice");
  });
});
