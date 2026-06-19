import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PantryScreen } from "./PantryScreen";
import type { Pantry } from "./pantry";

const base = { today: "2026-06-18", onAdd: vi.fn(), onRemove: vi.fn(), onToggleStaple: vi.fn(), onBack: vi.fn() };

describe("PantryScreen (Brief v46)", () => {
  it("shows an empty state and an add form", () => {
    render(<PantryScreen {...base} pantry={[]} />);
    expect(screen.getByText(/your pantry is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /item name/i })).toBeInTheDocument();
  });

  it("adds an item from the form", () => {
    const onAdd = vi.fn();
    render(<PantryScreen {...base} pantry={[]} onAdd={onAdd} />);
    fireEvent.change(screen.getByRole("textbox", { name: /item name/i }), { target: { value: "toor dal" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0]![0].name).toBe("toor dal");
  });

  it("groups items by aisle and flags expiring ones", () => {
    const pantry: Pantry = [
      { name: "toor dal", qty: 1, unit: "cup" },
      { name: "milk", expiry: "2026-06-19" }, // within 3 days of the 18th
    ];
    render(<PantryScreen {...base} pantry={pantry} />);
    expect(screen.getByRole("heading", { name: /lentils & beans/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /dairy/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /remove milk/i }));
    expect(base.onRemove).toHaveBeenCalledWith("milk");
  });
});
