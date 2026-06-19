import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary, type RecipeGraph } from "@tutti/engine";
import { LibraryBrowser } from "./LibraryBrowser";
import { createLocalProvider } from "./library/localProvider";

// Drive the browse-at-scale UI against a real (in-memory) provider over the golden library — no
// network, but the same async LibraryProvider contract the live API implements.
const provider = createLocalProvider(goldenLibrary as RecipeGraph[]);

describe("LibraryBrowser (Phase D)", () => {
  it("renders category chips and dish cards from the provider", async () => {
    render(<LibraryBrowser provider={provider} onAddRecipe={() => {}} />);
    // Category chips load from getCategories.
    expect(await screen.findByRole("button", { name: /^Rice/ })).toBeInTheDocument();
    // Dish cards load from searchDishes (page 1).
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^Add /i }).length).toBeGreaterThan(0));
  });

  it("filters by category when a chip is tapped", async () => {
    render(<LibraryBrowser provider={provider} onAddRecipe={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /^Rice/ }));
    await waitFor(() => {
      const adds = screen.getAllByRole("button", { name: /^Add /i });
      // Every visible dish should be a rice dish (e.g. includes "Rice" in its label).
      expect(adds.length).toBeGreaterThan(0);
      expect(adds.some((b) => /rice/i.test(b.getAttribute("aria-label") || ""))).toBe(true);
    });
  });

  it("adds a single-variant dish immediately with its recipeId", async () => {
    const onAdd = vi.fn();
    render(<LibraryBrowser provider={provider} onAddRecipe={onAdd} />);
    // Curd Rice is a single-variant dish in the golden library.
    const btn = await screen.findByRole("button", { name: /^Add Curd Rice$/i });
    fireEvent.click(btn);
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(typeof onAdd.mock.calls[0]![0]).toBe("string");
  });

  it("expands a multi-variant dish to pick a tier", async () => {
    const onAdd = vi.fn();
    render(<LibraryBrowser provider={provider} onAddRecipe={onAdd} />);
    // Tomato Rasam (dish_rasam) has simple + moderate variants → "versions".
    const dishBtn = await screen.findByRole("button", { name: /Tomato Rasam, 2 versions/i });
    fireEvent.click(dishBtn);
    const group = await screen.findByRole("group", { name: /Choose a version of Tomato Rasam/i });
    const tierBtns = within(group).getAllByRole("button");
    expect(tierBtns.length).toBe(2);
    fireEvent.click(tierBtns[0]!);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("searches by name", async () => {
    render(<LibraryBrowser provider={provider} onAddRecipe={() => {}} />);
    await screen.findAllByRole("button", { name: /^Add /i });
    fireEvent.change(screen.getByRole("searchbox", { name: /search recipes/i }), { target: { value: "rasam" } });
    await waitFor(() => {
      const adds = screen.getAllByRole("button", { name: /^Add |versions/i });
      expect(adds.every((b) => /rasam/i.test(b.getAttribute("aria-label") || ""))).toBe(true);
    });
  });

  it("shows an empty state when nothing matches", async () => {
    render(<LibraryBrowser provider={provider} onAddRecipe={() => {}} />);
    await screen.findAllByRole("button", { name: /^Add /i });
    fireEvent.change(screen.getByRole("searchbox", { name: /search recipes/i }), { target: { value: "zzzznomatch" } });
    expect(await screen.findByText(/No dishes match/i)).toBeInTheDocument();
  });
});
