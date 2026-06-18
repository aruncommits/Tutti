import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen";

const props = () => ({
  pro: false, onTogglePro: vi.fn(),
  learnPace: true, onToggleLearn: vi.fn(),
  metric: false, onToggleMetric: vi.fn(),
  onExport: vi.fn(), onReset: vi.fn(), onBack: vi.fn(),
});

describe("SettingsScreen (Brief v22 items 2+5)", () => {
  it("toggles preferences and exports", () => {
    const p = props();
    render(<SettingsScreen {...p} />);
    fireEvent.click(screen.getByRole("switch", { name: /pro mode/i }));
    expect(p.onTogglePro).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("switch", { name: /learn my pace/i }));
    expect(p.onToggleLearn).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /export my data/i }));
    expect(p.onExport).toHaveBeenCalledTimes(1);
  });

  it("requires a second tap to actually reset", () => {
    const p = props();
    render(<SettingsScreen {...p} />);
    fireEvent.click(screen.getByRole("button", { name: /reset everything/i }));
    expect(p.onReset).not.toHaveBeenCalled(); // armed, not fired
    fireEvent.click(screen.getByRole("button", { name: /tap again to erase/i }));
    expect(p.onReset).toHaveBeenCalledTimes(1);
  });
});
