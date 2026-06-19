import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { applyEvent, compile, goldenLibrary } from "@tutti/engine";
import { App } from "./App";
import { DEFAULT_KITCHEN, toKitchenProfile } from "./kitchenModel";

// Never lose your place (Brief v43): an in-progress cook is always resumable, survives reopen, and
// is never silently overwritten. Built meals auto-save.

const sambar = goldenLibrary.find((r) => r.recipeId === "rec_sambar")!;

function livePlan(completeFirst = false) {
  let plan = compile([sambar], toKitchenProfile(DEFAULT_KITCHEN), "20:00:00", {});
  if (completeFirst) plan = applyEvent(plan, { type: "complete", nodeId: plan.nodes[0]!.nodeId, at: "" });
  return plan;
}

function seed(opts: { screen?: string; cook?: boolean; complete?: boolean } = {}) {
  const { screen: scr = "cook", cook = true, complete = false } = opts;
  localStorage.clear();
  localStorage.setItem("tutti.onboarded", "true");
  localStorage.setItem("tutti.screen", JSON.stringify(scr));
  localStorage.setItem("tutti.dishes", JSON.stringify(["rec_sambar"]));
  localStorage.setItem("tutti.plan", JSON.stringify(livePlan(complete)));
  if (cook) localStorage.setItem("tutti.cookStartedAt", "123456");
}

describe("cook resume", () => {
  beforeEach(() => localStorage.clear());

  it("auto-resumes into the cook on reopen, even if last left on Home", async () => {
    seed({ screen: "home", cook: true });
    render(<App />);
    expect(await screen.findByRole("region", { name: "NOW" })).toBeInTheDocument();
  });

  it("restores completed progress after reopen", async () => {
    seed({ screen: "home", cook: true, complete: true });
    render(<App />);
    const done = await screen.findByRole("region", { name: "DONE" });
    expect(within(done).getByText(sambar.nodes[0]!.title)).toBeInTheDocument();
  });

  it("shows a Resume bar after leaving the cook and takes you back", async () => {
    seed({ screen: "cook", cook: true });
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /leave cooking/i }));
    const resume = await screen.findByRole("button", { name: /resume cooking/i });
    expect(resume).toBeInTheDocument();
    fireEvent.click(resume);
    expect(await screen.findByRole("region", { name: "NOW" })).toBeInTheDocument();
  });

  it("shows no Resume bar when no cook is in progress", async () => {
    seed({ screen: "home", cook: false });
    render(<App />);
    expect(await screen.findByRole("heading", { level: 2, name: /plan a meal/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resume cooking/i })).toBeNull();
  });

  it("ends a cook from the bar with a two-tap confirm", async () => {
    seed({ screen: "cook", cook: true });
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /leave cooking/i }));
    fireEvent.click(await screen.findByRole("button", { name: /end this cook/i })); // arm
    fireEvent.click(screen.getByRole("button", { name: /tap again to end/i })); // confirm
    expect(screen.queryByRole("button", { name: /resume cooking/i })).toBeNull();
    expect(localStorage.getItem("tutti.cookStartedAt")).toBe("null");
  });
});

describe("auto-save built meals", () => {
  beforeEach(() => localStorage.clear());

  it("saves a meal to Meals when a plan is built — no manual Save step", async () => {
    localStorage.setItem("tutti.onboarded", "true");
    localStorage.setItem("tutti.screen", '"home"');
    localStorage.setItem("tutti.dishes", JSON.stringify(["rec_sambar"]));
    render(<App />);
    // Builder is lazy; the dish is already in the plan → just build.
    fireEvent.click(await screen.findByRole("button", { name: /build plan/i }));
    await screen.findByRole("region", { name: /your plan/i });
    const meals = JSON.parse(localStorage.getItem("tutti.meals") || "[]");
    expect(meals.some((m: { kind: string }) => m.kind === "saved")).toBe(true);
  });
});
