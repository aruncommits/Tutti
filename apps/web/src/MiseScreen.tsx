import { useState } from "react";
import { buildShoppingList, type RecipeGraph } from "@tutti/engine";
import { requiredEquipment, labelFor, missingEquipment } from "./mise";
import type { KitchenUi } from "./kitchenModel";

// Mise en place / "Get ready" (Brief v20). Gather ingredients + ready the equipment before the
// first timer starts. Checkable, skippable, and honest about tools the kitchen may lack.

const amt = (i: { amount?: number; unit?: string }) =>
  i.amount !== undefined ? `${i.amount}${i.unit ? ` ${i.unit}` : ""}` : "to taste";

export function MiseScreen({
  recipes,
  kitchen,
  onStart,
  onBack,
}: {
  recipes: RecipeGraph[];
  kitchen: KitchenUi;
  onStart: () => void;
  onBack: () => void;
}) {
  const ingredients = buildShoppingList(recipes);
  const equipment = requiredEquipment(recipes);
  const missing = missingEquipment(recipes, kitchen);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setChecked((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const Row = ({ k, label, sub }: { k: string; label: string; sub?: string }) => (
    <button className={`ing-row${checked.has(k) ? " tick" : ""}`} role="checkbox" aria-checked={checked.has(k)} onClick={() => toggle(k)}>
      <span className="box">{checked.has(k) ? "✓" : ""}</span>
      <span className="nm">{label}</span>
      {sub && <span className="amt">{sub}</span>}
    </button>
  );

  return (
    <section className="zone" aria-label="Get ready">
      <h2 className="zone-h"><span>Get ready</span></h2>
      <p className="value">Gather everything first — then cook without scrambling.</p>

      {missing.length > 0 && (
        <p className="alert">
          Heads up — this meal uses {missing.map(labelFor).join(", ")}. Your kitchen doesn't list{" "}
          {missing.length > 1 ? "them" : "one"}. You can still cook — Tutti will improvise the schedule.
        </p>
      )}

      <h3 className="meal-sec">Gather</h3>
      <div className="ing-sec">
        {ingredients.map((i) => <Row key={`g|${i.name}|${i.unit ?? ""}`} k={`g|${i.name}|${i.unit ?? ""}`} label={i.name} sub={amt(i)} />)}
      </div>

      <h3 className="meal-sec">Equipment</h3>
      <div className="ing-sec">
        {equipment.map((cat) => <Row key={`e|${cat}`} k={`e|${cat}`} label={labelFor(cat)} />)}
      </div>

      <button className="btn big-btn" onClick={onStart}>Start cooking</button>
      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
