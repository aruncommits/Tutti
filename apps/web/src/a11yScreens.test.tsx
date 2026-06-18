import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { RecipeDetailScreen } from "./RecipeDetailScreen";
import { MiseScreen } from "./MiseScreen";
import { SettingsScreen } from "./SettingsScreen";
import { DEFAULT_KITCHEN } from "./kitchenModel";

const recipe = goldenLibrary[0]!;
const noop = vi.fn();

// Lock the a11y basics for screens added since the v9 audit (Brief v28 item 4): each has an h2,
// and toggle controls carry their On/Off state in the accessible name (label-content-name-match).
describe("new screens a11y scaffolding (Brief v28 item 4)", () => {
  it("RecipeDetail exposes a level-2 heading", () => {
    render(<RecipeDetailScreen recipe={recipe} onAdd={noop} onBack={noop} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("Mise exposes a level-2 heading", () => {
    render(<MiseScreen recipes={[recipe]} kitchen={DEFAULT_KITCHEN} onStart={noop} onBack={noop} />);
    expect(screen.getByRole("heading", { level: 2, name: /get ready/i })).toBeInTheDocument();
  });

  it("Settings exposes a heading and toggles whose name includes On/Off", () => {
    render(
      <SettingsScreen pro={false} onTogglePro={noop} learnPace onToggleLearn={noop}
        metric={false} onToggleMetric={noop} onExport={noop} onReset={noop} onBack={noop} />,
    );
    expect(screen.getByRole("heading", { level: 2, name: /settings/i })).toBeInTheDocument();
    // accessible name carries the visible On/Off text (WCAG 2.5.3)
    expect(screen.getByRole("switch", { name: /pro mode, off/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /learn my pace, on/i })).toBeInTheDocument();
  });
});
