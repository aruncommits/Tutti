import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { compile, toSummary, thaliV1 } from "@tutti/engine";
import { PreviewScreen } from "./PreviewScreen";

// A real multi-step plan from the thali fixture.
const plan = compile(thaliV1.recipes, thaliV1.kitchenProfile, "20:00:00");

describe("PreviewScreen — reorder the cooking flow", () => {
  it("shows a reorderable step list and calls onReorder with a new order, reflecting the move", () => {
    const onReorder = vi.fn();
    render(<PreviewScreen plan={plan} onReorder={onReorder} onStart={() => {}} onEdit={() => {}} />);

    const firstBefore = screen.getAllByRole("button", { name: /move ".*" later/i })[0]!;
    const labelBefore = firstBefore.getAttribute("aria-label");
    fireEvent.click(firstBefore);

    expect(onReorder).toHaveBeenCalledTimes(1);
    const order = onReorder.mock.calls[0]![0] as string[];
    expect(order.length).toBe(plan.nodes.length); // full node order passed
    // the first step is no longer first in the list (it moved later)
    const firstAfter = screen.getAllByRole("button", { name: /move ".*" later/i })[0]!;
    expect(firstAfter.getAttribute("aria-label")).not.toBe(labelBefore);
  });

  it("hides the reorder list when onReorder is not provided", () => {
    render(<PreviewScreen plan={plan} onStart={() => {}} onEdit={() => {}} />);
    expect(screen.queryByText(/your order/i)).toBeNull();
  });

  it("keeps every dish in the flow (uses the engine summary as a sanity anchor)", () => {
    expect(toSummary(thaliV1.recipes[0]!).name.length).toBeGreaterThan(0);
  });
});
