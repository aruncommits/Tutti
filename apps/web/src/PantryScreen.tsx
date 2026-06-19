import { useState } from "react";
import { aisleOf, aisleOrder } from "@tutti/engine";
import { expiringSoon, type Pantry, type PantryItem } from "./pantry";

// Pantry inventory (Brief v46): what you have on hand, grouped by aisle, with optional quantity and
// expiry. Staples ("always have") are hidden from the shopping list; expiring items are flagged.

export function PantryScreen({
  pantry,
  today,
  onAdd,
  onRemove,
  onToggleStaple,
  onBack,
}: {
  pantry: Pantry;
  today: string;
  onAdd: (item: PantryItem) => void;
  onRemove: (name: string) => void;
  onToggleStaple: (name: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [expiry, setExpiry] = useState("");
  const [staple, setStaple] = useState(false);

  const soon = new Set(expiringSoon(pantry, today, 3).map((p) => p.name));
  const byAisle = new Map<string, PantryItem[]>();
  for (const item of pantry) {
    const a = aisleOf(item.name);
    (byAisle.get(a) ?? byAisle.set(a, []).get(a)!).push(item);
  }
  const aisles = [...byAisle.keys()].sort((a, b) => aisleOrder(a) - aisleOrder(b));

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), qty: qty ? Number(qty) : undefined, unit: unit.trim() || undefined, expiry: expiry || undefined, staple });
    setName(""); setQty(""); setUnit(""); setExpiry(""); setStaple(false);
  };

  return (
    <section className="zone" aria-label="Pantry">
      <h2 className="zone-h"><span>Pantry</span>{pantry.length > 0 && <span className="count">{pantry.length}</span>}</h2>

      <div className="pantry-add" role="group" aria-label="Add a pantry item">
        <input className="url-input" type="text" value={name} placeholder="Add an item (e.g. toor dal)" aria-label="Item name" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        <div className="pantry-add-row">
          <input className="timer-mins" type="number" min={0} step="any" value={qty} placeholder="qty" aria-label="Quantity" onChange={(e) => setQty(e.target.value)} />
          <input className="timer-mins" type="text" value={unit} placeholder="unit" aria-label="Unit" onChange={(e) => setUnit(e.target.value)} />
          <input className="time-input time-input-sm" type="date" value={expiry} aria-label="Expiry date" onChange={(e) => setExpiry(e.target.value)} />
          <label className="chip-toggle pantry-staple"><input type="checkbox" checked={staple} onChange={(e) => setStaple(e.target.checked)} /> always have</label>
          <button className="btn mini" onClick={submit}>Add</button>
        </div>
      </div>

      {pantry.length === 0 ? (
        <div className="idle">Your pantry is empty. Add what you keep on hand — staples get hidden from your shopping list, and tracked items warn you before they expire.</div>
      ) : (
        aisles.map((a) => (
          <div className="ing-sec" key={a}>
            <h3 className="meal-sec">{a}</h3>
            <div className="card-grid ing-grid">
              {byAisle.get(a)!.map((item) => (
                <div className={`ing-row staple-wrap${soon.has(item.name) ? " expiring" : ""}`} key={item.name}>
                  <span className="ing-main" style={{ pointerEvents: "none" }}>
                    <span className="nm">{item.name}{item.staple ? " 🏠" : ""}</span>
                    <span className="amt">{item.qty !== undefined ? `${item.qty}${item.unit ? ` ${item.unit}` : ""}` : ""}{item.expiry ? ` · exp ${item.expiry}${soon.has(item.name) ? " ⚠" : ""}` : ""}</span>
                  </span>
                  <button className={`staple-toggle${item.staple ? " on" : ""}`} aria-pressed={!!item.staple} aria-label={`${item.staple ? "Unmark" : "Mark"} ${item.name} as always-have`} title="I always have this" onClick={() => onToggleStaple(item.name)}>🏠</button>
                  <button className="row-x" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.name)}>×</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
