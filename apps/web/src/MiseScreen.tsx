import { useState } from "react";
import { buildShoppingList, type RecipeGraph } from "@tutti/engine";
import { requiredEquipment, labelFor, missingEquipment } from "./mise";
import { displayAmount } from "./units";
import { Stars } from "./Stars";
import { colorFor } from "./dishColors";
import type { KitchenUi } from "./kitchenModel";
import type { NotesMap } from "./recipeNotes";

// Mise en place / "Get ready" (Brief v20). Gather ingredients + ready the equipment before the
// first timer starts. Checkable, skippable, and honest about tools the kitchen may lack.

export function MiseScreen({
  recipes,
  kitchen,
  metric = false,
  notes = {},
  photos = {},
  onStart,
  onBack,
}: {
  recipes: RecipeGraph[];
  kitchen: KitchenUi;
  metric?: boolean;
  notes?: NotesMap;
  photos?: Record<string, string>;
  onStart: () => void;
  onBack: () => void;
}) {
  const ingredients = buildShoppingList(recipes);
  const equipment = requiredEquipment(recipes);
  const missing = missingEquipment(recipes, kitchen);
  // Resurface what you learned last time, right as you're about to cook it again (Brief v32).
  const reminders = recipes.filter((r) => { const n = notes[r.recipeId]; return n && (n.note || n.rating); });
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

      {reminders.length > 0 && (
        <>
          <h3 className="meal-sec">Last time</h3>
          {reminders.map((r) => {
            const n = notes[r.recipeId]!;
            return (
              <div className="last-note" key={r.recipeId}>
                {photos[r.recipeId] && <img className="dish-thumb" src={photos[r.recipeId]} alt={`Your ${r.name}`} />}
                <span className="swatch" style={{ background: colorFor(r.recipeId) }} />
                <span className="nm">{r.name}</span>
                {n.rating ? <Stars value={n.rating} /> : null}
                {n.note ? <span className="sub-hint">“{n.note}”</span> : null}
              </div>
            );
          })}
        </>
      )}

      <h3 className="meal-sec">Gather</h3>
      <div className="ing-sec">
        {ingredients.map((i) => <Row key={`g|${i.name}|${i.unit ?? ""}`} k={`g|${i.name}|${i.unit ?? ""}`} label={i.name} sub={displayAmount(i.amount, i.unit, i.toTaste, metric)} />)}
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
