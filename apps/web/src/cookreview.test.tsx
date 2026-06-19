import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { compile, applyEvent, thaliV1, goldenLibrary } from "@tutti/engine";
import { CookScreen } from "./CookScreen";
import { RecipePicker } from "./RecipePicker";

function donePlan() {
  let plan = compile(thaliV1.recipes, thaliV1.kitchenProfile, "19:30:00");
  for (const n of plan.nodes) plan = applyEvent(plan, { type: "complete", nodeId: n.nodeId, at: "" });
  return plan;
}

describe("Cook Mode finale review (Brief v17 items 3+5)", () => {
  it("rates a just-cooked dish from the finale", () => {
    const onRate = vi.fn();
    const dishes = [...new Set(thaliV1.recipes.map((r) => r.recipeId))];
    render(
      <CookScreen plan={donePlan()} pro onComplete={vi.fn()} onUndo={vi.fn()} onReset={vi.fn()}
        notes={{}} dishesForReview={dishes} onRate={onRate} onNote={vi.fn()} />,
    );
    expect(screen.getByText(/how did it go/i)).toBeInTheDocument();
    // pick the first "5 stars" control and click it
    const five = screen.getAllByRole("button", { name: /5 stars/i })[0]!;
    fireEvent.click(five);
    expect(onRate).toHaveBeenCalledTimes(1);
    expect(onRate.mock.calls[0]![1]).toBe(5);
  });

  it("omits the review block when no rating handler is provided", () => {
    render(<CookScreen plan={donePlan()} pro onComplete={vi.fn()} onUndo={vi.fn()} onReset={vi.fn()} />);
    expect(screen.queryByText(/how did it go/i)).toBeNull();
    expect(screen.getByText(/dinner is served/i)).toBeInTheDocument();
  });
});

describe("Browse shows ratings & cook count (Brief v17 item 4)", () => {
  it("renders saved stars and cook count for a rated recipe", () => {
    render(<RecipePicker avoid={[]} library={goldenLibrary} notes={{ rec_chutney: { rating: 4, cookCount: 3 } }} onPick={vi.fn()} />);
    // A frequently-cooked dish shows in both "You cook these often" and its cuisine accordion.
    expect(screen.getAllByText(/cooked 3×/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/4 of 5 stars/i).length).toBeGreaterThan(0);
  });
});
