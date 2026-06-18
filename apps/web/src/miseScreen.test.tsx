import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { MiseScreen } from "./MiseScreen";
import { DEFAULT_KITCHEN } from "./kitchenModel";

const chutney = goldenLibrary.find((r) => r.recipeId === "rec_chutney")!; // needs a blender

describe("MiseScreen (Brief v20 items 2+5)", () => {
  it("lists gather + equipment and warns about a missing tool", () => {
    render(<MiseScreen recipes={[chutney]} kitchen={{ ...DEFAULT_KITCHEN, blender: false }} onStart={() => {}} onBack={() => {}} />);
    expect(screen.getByRole("heading", { name: /gather/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /equipment/i })).toBeInTheDocument();
    expect(screen.getAllByText(/blender\/mixie/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/heads up/i)).toBeInTheDocument();
  });

  it("shows no warning when the kitchen has the gear, and Start cooking fires", () => {
    const onStart = vi.fn();
    render(<MiseScreen recipes={[chutney]} kitchen={DEFAULT_KITCHEN} onStart={onStart} onBack={() => {}} />);
    expect(screen.queryByText(/heads up/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /start cooking/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
