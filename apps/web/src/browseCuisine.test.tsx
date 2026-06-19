import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { BrowseScreen } from "./BrowseScreen";
import { toLibraryEntries, groupByCuisine } from "./libraryView";

// Browse now discovers by cuisine accordion (Brief v41): the largest cuisine is open by default,
// others expand on demand and sub-group by dish-type. (Replaces the old cuisine chip row.)
describe("Browse cuisine accordions (Brief v41)", () => {
  it("opens the largest cuisine by default and toggles others on demand", () => {
    render(<BrowseScreen avoid={[]} notes={{}} onPick={vi.fn()} onBack={vi.fn()} />);
    const groups = groupByCuisine(toLibraryEntries(goldenLibrary));
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
