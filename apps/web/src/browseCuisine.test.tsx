import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { RecipePicker } from "./RecipePicker";
import { toLibraryEntries, groupByCuisine } from "./libraryView";

// A fixed South-Indian-dominant subset so the assertions don't depend on the full library mix.
const LIB = goldenLibrary.filter((r) => ["rec_chutney", "rec_rasam", "rec_curdrice", "rec_lemonrice", "rec_beetroot", "rec_sambar", "rec_aglio", "rec_tompasta"].includes(r.recipeId));

// Browse now discovers by cuisine accordion (Brief v41): the largest cuisine is open by default,
// others expand on demand and sub-group by dish-type. (Replaces the old cuisine chip row.)
describe("Browse cuisine accordions (Brief v41)", () => {
  it("opens the largest cuisine by default and toggles others on demand", () => {
    render(<RecipePicker avoid={[]} notes={{}} library={LIB} onPick={vi.fn()} />);
    const groups = groupByCuisine(toLibraryEntries(LIB));
    const [biggest, second] = groups;

    const bigHead = screen.getByRole("button", { name: new RegExp(`^${biggest!.cuisine}`, "i") });
    expect(bigHead).toHaveAttribute("aria-expanded", "true");

    if (second) {
      const secondHead = screen.getByRole("button", { name: new RegExp(`^${second.cuisine}`, "i") });
      expect(secondHead).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(secondHead);
      expect(secondHead).toHaveAttribute("aria-expanded", "true");
      // opening one cuisine closes the previously open one (single-open accordion)
      expect(bigHead).toHaveAttribute("aria-expanded", "false");
    }
  });
});
