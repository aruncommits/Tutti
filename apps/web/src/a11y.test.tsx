import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { App } from "./App";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("tutti.onboarded", "true");
  localStorage.setItem("tutti.screen", '"browse"');
});

describe("App accessibility scaffolding (Brief v9)", () => {
  it("renders a polite live-region status node and a skip-to-content link", () => {
    const { container } = render(<App />);
    expect(container.querySelector('[role="status"][aria-live="polite"]')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /skip to content/i })).toBeInTheDocument();
  });

  it("exposes a focusable main screen region with a heading", () => {
    const { container } = render(<App />);
    const region = container.querySelector("#screen-main");
    expect(region).toBeInTheDocument();
    expect(region?.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByRole("heading", { level: 2, name: /browse recipes/i })).toBeInTheDocument();
  });
});
