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

  it("plans a meal through Pick -> Preview -> Get ready -> Cook", async () => {
    render(<App />);

    const LAZY = { timeout: 4000 }; // lazy screens (Pick/Preview/Mise) under parallel-load
    fireEvent.click(screen.getByRole("button", { name: /pick dishes/i }));
    // thali dishes are selected by default -> proceed
    fireEvent.click(await screen.findByRole("button", { name: /set serve time/i }, LAZY));
    fireEvent.click(await screen.findByRole("button", { name: /build my plan/i }, LAZY));

    // Preview is lazy-loaded (region label is stable across heading-text redesigns)
    expect(await screen.findByRole("region", { name: /your plan/i }, LAZY)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start cooking/i }));

    // "Get ready" mise screen (lazy)
    expect(await screen.findByRole("heading", { name: /get ready/i }, LAZY)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start cooking/i }));

    // Cook Mode
    expect(await screen.findByText(/serving at/i)).toBeInTheDocument();
  });
});
