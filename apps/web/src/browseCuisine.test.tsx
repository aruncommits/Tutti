import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { BrowseScreen } from "./BrowseScreen";
import { toLibraryEntries, filterLibrary, cuisinesOf } from "./libraryView";

const addButtons = () => screen.getAllByRole("button", { name: /^add /i });

describe("Browse cuisine filter (Brief v39 items 3+5)", () => {
  it("narrows the list to a chosen cuisine and All restores it", () => {
    render(<BrowseScreen avoid={[]} notes={{}} onPick={vi.fn()} onBack={vi.fn()} />);
    const all = addButtons().length;

    const cuisine = cuisinesOf(toLibraryEntries(goldenLibrary))[0]!; // e.g. "East Asian"
    const expected = filterLibrary(toLibraryEntries(goldenLibrary), { cuisine }).length;
    expect(expected).toBeLessThan(all); // a single cuisine is a strict subset

    const group = within(screen.getByRole("group", { name: "Cuisine" }));
    fireEvent.click(group.getByRole("button", { name: new RegExp(`^${cuisine}$`, "i") }));
    expect(addButtons().length).toBe(expected);

    fireEvent.click(group.getByRole("button", { name: /^all$/i }));
    expect(addButtons().length).toBe(all);
  });
});
