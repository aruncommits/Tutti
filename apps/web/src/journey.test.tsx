import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { thaliV1 } from "@tutti/engine";
import { App } from "./App";

// End-to-end cook journey (Brief v30) — drives the whole flow like a user, by visible text/role,
// so a cross-screen wiring break trips the gate. The engine is property-tested elsewhere; this
// guards the engine-to-UI seam across the meal-plan builder → preview → mise → cook.

const LAZY = { timeout: 4000 }; // lazy screens (Browse/Preview/Mise) under parallel-load
// Driving a full cook (lazy screens + ~13 steps) is slow under full-suite parallel load — give the
// end-to-end cook tests headroom over vitest's 5s default so they don't flake on a timeout.
const COOK_RUN = 20000;

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
  it("builds a meal and cooks it all the way to the finale", async () => {
    // Seed a plan's worth of recipes (the builder starts empty; a user would add these).
    localStorage.setItem("tutti.dishes", JSON.stringify(thaliV1.recipes.map((r) => r.recipeId)));
    render(<App />);

    // Builder is lazy-loaded — await it, then build.
    fireEvent.click(await screen.findByRole("button", { name: /build plan/i }, LAZY));
    // Preview (lazy) → start → Get ready (lazy) → start → Cook
    fireEvent.click(await screen.findByRole("button", { name: /start cooking/i }, LAZY));
    fireEvent.click(await screen.findByRole("button", { name: /start cooking/i }, LAZY));
    expect(await screen.findByText(/serving at/i, {}, LAZY)).toBeInTheDocument();

    for (let i = 0; i < 80 && !isDone(); i++) {
      if (!clickNextCookAction()) break;
    }
    expect(await screen.findByText(/dinner is served/i)).toBeInTheDocument();
  }, COOK_RUN);

  it("clears the resume bar once cooking is finished, even if you leave the finale via nav", async () => {
    localStorage.setItem("tutti.dishes", JSON.stringify(thaliV1.recipes.map((r) => r.recipeId)));
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /build plan/i }, LAZY));
    fireEvent.click(await screen.findByRole("button", { name: /start cooking/i }, LAZY));
    fireEvent.click(await screen.findByRole("button", { name: /start cooking/i }, LAZY));
    expect(await screen.findByText(/serving at/i, {}, LAZY)).toBeInTheDocument();

    for (let i = 0; i < 80 && !isDone(); i++) { if (!clickNextCookAction()) break; }
    expect(await screen.findByText(/dinner is served/i)).toBeInTheDocument();

    // Leave the finished cook via the nav instead of tapping "Cook it again" — the resume bar must
    // not reappear, because a 7/7 cook has nothing left to resume.
    fireEvent.click((await screen.findAllByRole("button", { name: /^home$/i }))[0]!);
    expect(screen.queryByRole("button", { name: /resume cooking/i })).toBeNull();
  }, COOK_RUN);

  it("cooks a saved meal again straight from the timeline, no rebuild (gap fix)", async () => {
    // A saved meal was already built when it was saved — tapping it must skip the Build step.
    const meal = {
      id: "m1",
      name: "Saved Thali",
      dishIds: thaliV1.recipes.map((r) => r.recipeId),
      servings: {},
      target: "20:00:00",
      savedAt: 1,
      kind: "saved" as const,
    };
    localStorage.setItem("tutti.meals", JSON.stringify([meal]));
    render(<App />);

    // Open Meals (nav exists in both the sidebar and the bottom bar — take the first), then tap the meal.
    fireEvent.click((await screen.findAllByRole("button", { name: /^meals$/i }, LAZY))[0]!);
    fireEvent.click(await screen.findByRole("button", { name: /cook saved thali again/i }, LAZY));

    // Lands directly on the built plan preview — Start cooking is available without ever building.
    expect(await screen.findByRole("region", { name: /your plan/i }, LAZY)).toBeInTheDocument();
    expect(await screen.findByText(/all dishes ready together/i, {}, LAZY)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start cooking/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /build plan/i })).toBeNull();
  });

  it("adds a recipe via the inline picker and builds a plan", async () => {
    render(<App />);

    // Empty builder (lazy) opens with the recipe picker already expanded → add the first recipe.
    const adds = await screen.findAllByRole("button", { name: /^add /i }, LAZY);
    fireEvent.click(adds[0]!);

    // Back on the builder, build the plan → Preview region appears.
    fireEvent.click(await screen.findByRole("button", { name: /build plan/i }, LAZY));
    expect(await screen.findByRole("region", { name: /your plan/i }, LAZY)).toBeInTheDocument();
  });
});
