import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { MiseScreen } from "./MiseScreen";
import { DEFAULT_KITCHEN } from "./kitchenModel";

const rasam = goldenLibrary.find((r) => r.recipeId === "rec_rasam")!;
const noop = vi.fn();

describe("MiseScreen resurfaces saved notes (Brief v32)", () => {
  it("shows your last-time note + rating for a dish in the meal", () => {
    render(
      <MiseScreen recipes={[rasam]} kitchen={DEFAULT_KITCHEN}
        notes={{ rec_rasam: { note: "more pepper", rating: 4, cookCount: 2 } }}
        onStart={noop} onBack={noop} />,
    );
    expect(screen.getByRole("heading", { name: /last time/i })).toBeInTheDocument();
    expect(screen.getByText(/more pepper/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/4 of 5 stars/i)).toBeInTheDocument();
  });

  it("shows no reminders block when there are no notes", () => {
    render(<MiseScreen recipes={[rasam]} kitchen={DEFAULT_KITCHEN} notes={{}} onStart={noop} onBack={noop} />);
    expect(screen.queryByRole("heading", { name: /last time/i })).toBeNull();
  });
});
