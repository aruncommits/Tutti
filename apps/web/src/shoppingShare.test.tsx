import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { thaliV1 } from "@tutti/engine";
import { ShoppingScreen } from "./ShoppingScreen";

// Mock the share module so the test asserts wiring, not the platform API.
const shareOrCopy = vi.fn().mockResolvedValue("copied");
vi.mock("./share", async (orig) => {
  const actual = await orig<typeof import("./share")>();
  return { ...actual, shareOrCopy: (...a: unknown[]) => shareOrCopy(...a) };
});

describe("ShoppingScreen share (Brief v16 items 2+5)", () => {
  it("has a Share list button that calls shareOrCopy and shows confirmation", async () => {
    render(<ShoppingScreen recipes={thaliV1.recipes} onBack={() => {}} />);
    const btn = screen.getByRole("button", { name: /share list/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(shareOrCopy).toHaveBeenCalledTimes(1);
    expect(shareOrCopy.mock.calls[0]![0]).toBe("Tutti shopping list");
    expect(await screen.findByText(/copied to clipboard/i)).toBeInTheDocument();
  });
});
