import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useAccordion, ExpandText } from "./Expandable";

const LONG = "Soak the dried red chilies in warm water for fifteen minutes, then grind them to a smooth paste.";

// A tiny harness exercising the accordion (one open at a time) with two ExpandText items.
function Harness() {
  const acc = useAccordion();
  return (
    <div>
      <div data-testid="a"><ExpandText text={LONG} open={acc.isOpen("a")} onToggle={() => acc.toggle("a")} /></div>
      <div data-testid="b"><ExpandText text="second item" open={acc.isOpen("b")} onToggle={() => acc.toggle("b")} /></div>
    </div>
  );
}

describe("Expandable — tap to reveal full text, one open at a time", () => {
  it("starts clamped and expands on tap", () => {
    render(<Harness />);
    const a = screen.getByTestId("a").querySelector("button")!;
    expect(a.getAttribute("aria-expanded")).toBe("false");
    expect(a.querySelector(".clamp")).toBeTruthy(); // clamped when closed
    fireEvent.click(a);
    expect(a.getAttribute("aria-expanded")).toBe("true");
    expect(a.querySelector(".clamp")).toBeNull(); // full when open
    expect(a.textContent).toContain("grind them to a smooth paste");
  });

  it("opening one collapses the other (accordion)", () => {
    render(<Harness />);
    const a = screen.getByTestId("a").querySelector("button")!;
    const b = screen.getByTestId("b").querySelector("button")!;
    fireEvent.click(a);
    expect(a.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(b);
    expect(b.getAttribute("aria-expanded")).toBe("true");
    expect(a.getAttribute("aria-expanded")).toBe("false"); // previous collapsed
  });

  it("tapping an open item closes it", () => {
    render(<Harness />);
    const a = screen.getByTestId("a").querySelector("button")!;
    fireEvent.click(a);
    fireEvent.click(a);
    expect(a.getAttribute("aria-expanded")).toBe("false");
  });
});
