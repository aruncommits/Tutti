import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { compile, goldenLibrary } from "@tutti/engine";
import { CookScreen } from "./CookScreen";

const noop = vi.fn();
// Curd rice's first step ("Cook rice soft") is passive with no dependencies → ready in NOW at start.
const curdRice = goldenLibrary.find((r) => r.recipeId === "rec_curdrice")!;
const kitchen = { cooks: 1, resources: [
  { category: "burner", count: 2 }, { category: "pan", count: 2, capabilities: ["small", "large"] },
  { category: "pressure_cooker", count: 1 }, { category: "cutting_board", count: 1 }, { category: "blender", count: 1 },
] };

describe("Cook Mode adjustable timers (Brief v24 items 2+5)", () => {
  it("exposes +1m/+5m once a passive task is started, and they don't throw", () => {
    const plan = compile([curdRice], kitchen, "19:30:00");
    render(<CookScreen plan={plan} pro onComplete={noop} onUndo={noop} onReset={noop} />);

    // Start the first passive ("cooks itself") task that's currently in NOW.
    const start = screen.queryAllByRole("button", { name: /cooks itself/i })[0];
    expect(start, "expected a started-able passive task in NOW").toBeTruthy();
    fireEvent.click(start!);

    const add1 = screen.getAllByRole("button", { name: /add 1 minute/i })[0]!;
    const add5 = screen.getAllByRole("button", { name: /add 5 minutes/i })[0]!;
    expect(add1).toBeInTheDocument();
    expect(add5).toBeInTheDocument();
    expect(() => { fireEvent.click(add1); fireEvent.click(add5); }).not.toThrow();
  });
});
