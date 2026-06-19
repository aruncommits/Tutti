import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("renders its children inside a labelled dialog", () => {
    render(<Modal onClose={() => {}} label="Tomato Rasam"><p>recipe body</p></Modal>);
    expect(screen.getByRole("dialog", { name: /tomato rasam/i })).toBeInTheDocument();
    expect(screen.getByText("recipe body")).toBeInTheDocument();
  });

  it("closes via the × button, the backdrop, and Escape", () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose}><p>body</p></Modal>);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    // clicking the panel itself must NOT close; clicking the backdrop must
    fireEvent.click(screen.getByText("body"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
