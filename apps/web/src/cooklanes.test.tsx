import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { compile, thaliV1, type KitchenProfile } from "@tutti/engine";
import { CookScreen } from "./CookScreen";

const ample = (cooks: number): KitchenProfile => ({
  cooks,
  resources: [
    { category: "burner", count: 4 },
    { category: "pan", count: 4, capabilities: ["small", "large"] },
    { category: "pressure_cooker", count: 1 },
    { category: "cutting_board", count: 2 },
    { category: "blender", count: 1 },
  ],
});

const noop = vi.fn();

describe("Cook Mode hands-lanes (Brief v14 items 3+5)", () => {
  it("shows lane chips (You / Cook 2) when the plan was built for 2 cooks", () => {
    const plan = compile(thaliV1.recipes, ample(2), "19:30:00");
    render(<CookScreen plan={plan} pro onComplete={noop} onUndo={noop} onReset={noop} />);
    expect(screen.getAllByText("You").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cook 2").length).toBeGreaterThan(0);
  });

  it("shows no lane chips when cooking solo", () => {
    const plan = compile(thaliV1.recipes, ample(1), "19:30:00");
    render(<CookScreen plan={plan} pro onComplete={noop} onUndo={noop} onReset={noop} />);
    expect(screen.queryByText("You")).toBeNull();
    expect(screen.queryByText(/^Cook \d$/)).toBeNull();
  });
});
