import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { compile, thaliV1 } from "@tutti/engine";
import { PreviewScreen } from "./PreviewScreen";

const plan = compile(thaliV1.recipes, thaliV1.kitchenProfile, "20:00:00");

const stepTexts = (c: HTMLElement) =>
  [...c.querySelectorAll(".editor-list .editor-row .expandable")].map((e) => e.textContent);

describe("PreviewScreen — dishes legend + reorderable flow", () => {
  it("shows a 'dishes in this plan' legend with real names", () => {
    const { container } = render(
      <PreviewScreen plan={plan} recipes={thaliV1.recipes} onStart={() => {}} onEdit={() => {}} />,
    );
    const legend = container.querySelector(".plan-dishes")!;
    expect(legend).toBeTruthy();
    // every dish in the plan is named in the legend
    for (const r of thaliV1.recipes) expect(legend.textContent).toContain(r.name);
  });

  it("reorders the flow: onReorder gets the full new order and the list reflects the move", () => {
    const onReorder = vi.fn();
    const { container } = render(
      <PreviewScreen plan={plan} recipes={thaliV1.recipes} onReorder={onReorder} onStart={() => {}} onEdit={() => {}} />,
    );
    const before = stepTexts(container);
    const laterBtns = [...container.querySelectorAll(".editor-row .mini-btn")].filter((b) =>
      /later/i.test(b.getAttribute("aria-label") || ""),
    ) as HTMLButtonElement[];
    fireEvent.click(laterBtns[0]!);

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect((onReorder.mock.calls[0]![0] as string[]).length).toBe(plan.nodes.length);
    expect(stepTexts(container)[0]).not.toBe(before[0]); // first step moved
  });

  it("hides the reorder list when onReorder is not provided", () => {
    render(<PreviewScreen plan={plan} onStart={() => {}} onEdit={() => {}} />);
    expect(screen.queryByText(/your order/i)).toBeNull();
  });
});
