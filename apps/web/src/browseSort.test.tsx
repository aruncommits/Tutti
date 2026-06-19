import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { BrowseScreen } from "./BrowseScreen";
import { toLibraryEntries, filterLibrary, sortLibrary } from "./libraryView";

const addButtons = () => screen.getAllByRole("button", { name: /^add /i });

// Sort lives on the search results now (Brief v41): when a query is active the matches become a
// flat grid with the four sort chips; reordering never excludes a match.
describe("Browse sort on search results (Brief v38 + v41)", () => {
  it("renders four sort chips while searching and reorders without changing the count", () => {
    render(<BrowseScreen avoid={[]} notes={{}} onPick={vi.fn()} onBack={vi.fn()} />);
    fireEvent.change(screen.getByRole("searchbox", { name: /search recipes/i }), { target: { value: "rice" } });

    expect(screen.getByRole("button", { name: /^quickest$/i })).toBeInTheDocument();
    const before = addButtons().length;
    expect(before).toBe(filterLibrary(toLibraryEntries(goldenLibrary), { query: "rice" }).length);

    fireEvent.click(screen.getByRole("button", { name: /^quickest$/i }));
    expect(screen.getByRole("button", { name: /^quickest$/i })).toHaveAttribute("aria-pressed", "true");
    expect(addButtons().length).toBe(before); // sort reorders, never excludes

    const expectedFirst = sortLibrary(filterLibrary(toLibraryEntries(goldenLibrary), { query: "rice" }), "quickest")[0]!.recipe.name;
    expect(addButtons()[0]!).toHaveAccessibleName(new RegExp(`add ${expectedFirst}`, "i"));
  });
});
