import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { App } from "./App";

// The install button only appears when the browser fires beforeinstallprompt. Under jsdom that
// never happens, so it must be absent (the hook logic itself is covered by useInstallPrompt.test).
describe("Install Tutti button (Brief v27 items 2+5)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("tutti.onboarded", "true");
    localStorage.setItem("tutti.screen", '"home"');
  });

  it("is hidden when the app is not installable", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 2, name: /plan a meal/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /install tutti/i })).toBeNull();
  });
});
