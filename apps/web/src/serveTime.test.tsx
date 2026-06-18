import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ServeTimeScreen } from "./PlanFlow";

const base = {
  target: "19:30:00", onChange: () => {}, startTime: "18:54:00",
  feasible: true, earliestServe: "18:00:00", onBuild: () => {},
};

describe("ServeTimeScreen — cooking with help (Brief v13 item 5)", () => {
  it("shows the time saved when cooking with extra hands", () => {
    render(<ServeTimeScreen {...base} cooks={2} onCooks={() => {}} soonerMins={15} />);
    expect(screen.getByText(/15 min less/i)).toBeInTheDocument();
    expect(screen.getAllByText(/pairs of hands/i).length).toBeGreaterThan(0);
  });

  it("says it's about the same when the meal can't parallelize", () => {
    render(<ServeTimeScreen {...base} cooks={2} onCooks={() => {}} soonerMins={0} />);
    expect(screen.getByText(/about the same/i)).toBeInTheDocument();
  });

  it("hides the delta when cooking solo", () => {
    render(<ServeTimeScreen {...base} cooks={1} onCooks={() => {}} soonerMins={null} />);
    expect(screen.queryByText(/min less/i)).toBeNull();
    expect(screen.getByText(/1 pair of hands/i)).toBeInTheDocument();
  });

  it("steps the cook count via the buttons", () => {
    const onCooks = vi.fn();
    render(<ServeTimeScreen {...base} cooks={2} onCooks={onCooks} soonerMins={15} />);
    fireEvent.click(screen.getByRole("button", { name: /more cooks/i }));
    expect(onCooks).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: /fewer cooks/i }));
    expect(onCooks).toHaveBeenCalledWith(1);
  });
});
