import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { App } from "./App";

// End-to-end cook journey (Brief v30) — drives the whole flow like a user, by visible text/role,
// so a cross-screen wiring break trips the gate. The engine is property-tested elsewhere; this
// guards the engine-to-UI seam across the app.

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("tutti.onboarded", "true");
  localStorage.setItem("tutti.screen", '"home"');
});

const isDone = () => screen.queryByText(/dinner is served/i) !== null;

function clickNextCookAction(): boolean {
  const btns = screen.queryAllByRole("button");
  const start = btns.find((b) => /cooks itself/i.test(b.textContent || ""));
  if (start) { fireEvent.click(start); return true; }
  const done = btns.find(
    (b) => /done/i.test(b.getAttribute("aria-label") || "") || /^✓?\s*done$/i.test((b.textContent || "").trim()),
  );
  if (done) { fireEvent.click(done); return true; }
  return false;
}

describe("cook journey (Brief v30 item 1)", () => {
  it("cooks a meal from Home all the way to the finale", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /start cooking/i }));
    expect(screen.getByText(/serving at/i)).toBeInTheDocument(); // in Cook Mode

    for (let i = 0; i < 80 && !isDone(); i++) {
      if (!clickNextCookAction()) break;
    }

    expect(await screen.findByText(/dinner is served/i)).toBeInTheDocument();
  });
});
