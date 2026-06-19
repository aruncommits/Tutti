import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { RecipePicker } from "./RecipePicker";

// The shared discovery surface (Brief v41): search, recents/frequent/your-recipes, cuisine→dish.

describe("RecipePicker", () => {
  it("default-opens the largest cuisine and adds a dish on tap", () => {
    const onPick = vi.fn();
    render(<RecipePicker library={goldenLibrary} onPick={onPick} />);
    // South Indian (largest) is expanded by default → its dishes are pickable straight away.
    const row = screen.getByRole("button", { name: /add tomato rasam/i });
    fireEvent.click(row);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]![0].recipeId).toBe("rec_rasam");
  });

  it("collapses and expands a cuisine accordion", () => {
    render(<RecipePicker library={goldenLibrary} onPick={() => {}} />);
    const header = screen.getByRole("button", { name: /south indian/i });
    expect(header).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(header); // collapse
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /add tomato rasam/i })).toBeNull();
  });

  it("searching shows a flat result grid and hides the cuisine accordions", () => {
    render(<RecipePicker library={goldenLibrary} onPick={() => {}} />);
    fireEvent.change(screen.getByRole("searchbox", { name: /search recipes/i }), { target: { value: "rasam" } });
    expect(screen.getByRole("button", { name: /add tomato rasam/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /south indian/i })).toBeNull(); // accordions gone while searching
    expect(screen.queryByRole("button", { name: /add coconut chutney/i })).toBeNull();
  });

  it("shows Recently cooked / You cook these often from history", () => {
    const notes = { rec_rasam: { cookCount: 3, lastCookedAt: 1000 } };
    render(<RecipePicker library={goldenLibrary} notes={notes} onPick={() => {}} />);
    expect(screen.getByRole("heading", { name: /recently cooked/i })).toBeInTheDocument();
    const often = screen.getByRole("heading", { name: /you cook these often/i });
    expect(often).toBeInTheDocument();
    expect(within(often.closest(".pick-sec") as HTMLElement).getByRole("button", { name: /add tomato rasam/i })).toBeInTheDocument();
  });

  it("lists user candidates under Your recipes", () => {
    const mine = { ...goldenLibrary[0]!, recipeId: "rec_mine", name: "My Pasta Bake" };
    render(<RecipePicker library={goldenLibrary} candidates={[mine]} onPick={() => {}} />);
    const yours = screen.getByRole("heading", { name: /your recipes/i });
    expect(within(yours.closest(".pick-sec") as HTMLElement).getByRole("button", { name: /add my pasta bake/i })).toBeInTheDocument();
  });
});
