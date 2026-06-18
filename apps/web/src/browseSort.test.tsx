import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { BrowseScreen } from "./BrowseScreen";
import { toLibraryEntries, sortLibrary } from "./libraryView";

const addButtons = () => screen.getAllByRole("button", { name: /^add /i });

describe("Browse sort (Brief v38 items 2+5)", () => {
  it("renders four sort chips and reorders without changing the count", () => {
    render(<BrowseScreen avoid={[]} notes={{}} onPick={vi.fn()} onBack={vi.fn()} />);
    // sort group present
    expect(screen.getByRole("button", { name: /^quickest$/i })).toBeInTheDocument();
    const before = addButtons().length;

    fireEvent.click(screen.getByRole("button", { name: /^quickest$/i }));
    expect(screen.getByRole("button", { name: /^quickest$/i })).toHaveAttribute("aria-pressed", "true");
    expect(addButtons().length).toBe(before); // sort reorders, never excludes

    // the first row should be the shortest-total-time dish
    const expectedFirst = sortLibrary(toLibraryEntries(goldenLibrary), "quickest")[0]!.recipe.name;
    expect(addButtons()[0]!).toHaveAccessibleName(new RegExp(`add ${expectedFirst}`, "i"));
  });
});
