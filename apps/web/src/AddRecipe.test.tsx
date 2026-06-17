import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AddRecipe } from "./AddRecipe";

const RECIPE = `Lemon Rice
Ingredients:
2 cups cooked rice
1 tsp mustard seeds
Method:
Heat oil and add mustard seeds
Add rice and stir
Serve`;

describe("AddRecipe — paste flow (Brief v3 item 7)", () => {
  it("parses pasted text, shows an unverified valid result, and onAdd gets the graph", async () => {
    const onAdd = vi.fn();
    render(<AddRecipe onAdd={onAdd} onBack={() => {}} />);

    fireEvent.change(screen.getByRole("textbox", { name: /recipe text/i }), { target: { value: RECIPE } });
    fireEvent.click(screen.getByRole("button", { name: /parse recipe/i }));

    // PasteParser is async — wait for the result UI
    const addBtn = await screen.findByRole("button", { name: /add to my dishes/i });
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();

    fireEvent.click(addBtn);
    expect(onAdd).toHaveBeenCalledTimes(1);
    const graph = onAdd.mock.calls[0]![0];
    expect(graph.name).toBe("Lemon Rice");
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.verified).toBe(false);
  });

  it("offers the three ingestion tabs", () => {
    render(<AddRecipe onAdd={() => {}} onBack={() => {}} />);
    expect(screen.getByRole("button", { name: /^paste$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /find online/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ask ai/i })).toBeInTheDocument();
  });
});
