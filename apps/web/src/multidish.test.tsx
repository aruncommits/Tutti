import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { thaliV1 } from "@tutti/engine";
import { PickScreen } from "./PlanFlow";
import { ShoppingScreen } from "./ShoppingScreen";

const kuzhambu = thaliV1.recipes.find((r) => r.recipeId === "rec_kuzhambu")!;
const noop = () => {};

describe("PickScreen — allergen warning (Brief v4 item 7)", () => {
  it("warns on a dish that may contain an avoided allergen", () => {
    render(
      <PickScreen
        recipes={[kuzhambu]}
        selected={[]}
        onToggle={noop}
        soloMins={0}
        interleavedMins={0}
        onAdd={noop}
        onShopping={noop}
        avoid={["sesame"]}
        factorOf={() => 1}
        onSetFactor={noop}
        peopleTarget={4} onPeople={noop}
        onNext={noop}
      />,
    );
    expect(screen.getByText(/sesame/i)).toBeInTheDocument();
  });

  it("shows no warning when nothing is avoided", () => {
    render(
      <PickScreen recipes={[kuzhambu]} selected={[]} onToggle={noop} soloMins={0} interleavedMins={0}
        onAdd={noop} onShopping={noop} avoid={[]} factorOf={() => 1} onSetFactor={noop} peopleTarget={4} onPeople={noop} onNext={noop} />,
    );
    expect(screen.queryByText(/may contain|⚠/i)).toBeNull();
  });
});

describe("ShoppingScreen — consolidated list (Brief v4 item 7)", () => {
  it("renders a merged ingredient line across dishes", () => {
    render(<ShoppingScreen recipes={thaliV1.recipes} onBack={noop} />);
    expect(screen.getByText("salt")).toBeInTheDocument();
    expect(screen.getByText("mustard seeds")).toBeInTheDocument();
  });
});
