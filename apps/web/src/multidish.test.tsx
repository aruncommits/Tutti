import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { goldenLibrary, thaliV1 } from "@tutti/engine";
import { Builder } from "./Builder";
import { ShoppingScreen } from "./ShoppingScreen";
import type { MealFit } from "./mealFit";

const kuzhambu = thaliV1.recipes.find((r) => r.recipeId === "rec_kuzhambu")!;
const noop = () => {};

const builderProps = {
  factorOf: () => 1,
  onSetFactor: noop,
  onRemove: noop,
  peopleTarget: 4,
  onPeople: noop,
  serveAt: null,
  onServeAt: noop,
  soloMins: 0,
  interleavedMins: 0,
  feasible: true,
  earliestServe: "19:00:00",
  onBuild: noop,
  onPaste: noop,
  onAskAI: noop,
  library: goldenLibrary,
  candidates: [kuzhambu],
  notes: {},
  photos: {},
  selectedIds: ["rec_kuzhambu"],
  onPick: noop,
  onDetails: noop,
  onSetTier: noop,
  onShopping: noop,
  cookLive: false,
  fit: { makespanMins: 0, feasible: true, verdict: "fits", hint: "" } as MealFit,
};

// Allergen safety warning moved from the retired PickScreen onto the Builder plan row (Brief v42).
describe("Builder — allergen warning on a planned dish (Brief v4 item 7)", () => {
  it("warns when a planned dish may contain an avoided allergen", () => {
    render(<Builder {...builderProps} selected={[kuzhambu]} avoid={["sesame"]} />);
    expect(screen.getByText(/sesame/i)).toBeInTheDocument();
  });

  it("shows no warning when nothing is avoided", () => {
    render(<Builder {...builderProps} selected={[kuzhambu]} avoid={[]} />);
    expect(screen.queryByText(/may contain|⚠/i)).toBeNull();
  });
});

describe("ShoppingScreen — consolidated list (Brief v4 item 7)", () => {
  it("renders a merged ingredient line across dishes", () => {
    render(<ShoppingScreen recipes={thaliV1.recipes} onBack={vi.fn()} />);
    expect(screen.getByText("salt")).toBeInTheDocument();
    expect(screen.getByText("mustard seeds")).toBeInTheDocument();
  });
});
