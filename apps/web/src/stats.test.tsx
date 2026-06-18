import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatsScreen } from "./StatsScreen";

describe("StatsScreen (Brief v6 item 5)", () => {
  it("shows learned pace in plain language and a forget control", () => {
    render(
      <StatsScreen pace={{ chop: 1.2 }} events={[]} learnPace onToggleLearn={() => {}} onForget={() => {}} onBack={() => {}} />,
    );
    expect(screen.getByText("chop")).toBeInTheDocument();
    expect(screen.getByText(/slower/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /forget my learning/i })).toBeInTheDocument();
    expect(screen.getByText(/stays on this device/i)).toBeInTheDocument();
  });

  it("shows an empty state when there is no pace data yet", () => {
    render(<StatsScreen pace={{}} events={[]} learnPace onToggleLearn={() => {}} onForget={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/no pace data yet/i)).toBeInTheDocument();
  });
});
