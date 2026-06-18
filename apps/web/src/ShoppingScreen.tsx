import { useState } from "react";
import { buildShoppingList, normalizeIngredientName, type RecipeGraph } from "@tutti/engine";
import { usePersistentState } from "./state";
import { colorFor } from "./dishColors";
import { formatShoppingList, shareOrCopy, type ShareResult } from "./share";
import { partitionByPantry, isStaple } from "./pantry";
import { displayAmount } from "./units";

const SHARE_MSG: Record<ShareResult, string> = {
  shared: "Shared ✓",
  copied: "Copied to clipboard ✓",
  failed: "Couldn't share — select the text to copy it",
};

// Consolidated shopping list (Doc 6; Brief v4 item 4). Combined = one merged list across dishes;
// Separate = grouped per dish. Check-off persists. Dish color dots show who needs each line.

export function ShoppingScreen({
  recipes,
  onBack,
  pantry = [],
  metric = false,
  onToggleStaple,
}: {
  recipes: RecipeGraph[];
  onBack: () => void;
  pantry?: string[];
  metric?: boolean;
  onToggleStaple?: (name: string) => void;
}) {
  const [mode, setMode] = usePersistentState<"combined" | "separate">("tutti.shoppingMode", "combined");
  const [checked, setChecked] = usePersistentState<string[]>("tutti.shoppingChecked", []);
  const isChecked = (key: string) => checked.includes(key);
  const toggle = (key: string) => setChecked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const combined = buildShoppingList(recipes);
  const { toBuy, staples } = partitionByPantry(combined, pantry);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const onShare = async () => {
    // Share only what you actually need to buy — not your whole pantry (Brief v21).
    const text = formatShoppingList(toBuy.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit, toTaste: i.toTaste })));
    setShareMsg(SHARE_MSG[await shareOrCopy("Tutti shopping list", text)]);
  };

  type Item = (typeof combined)[number];
  const ItemRow = ({ item }: { item: Item }) => {
    const key = `c|${item.name}|${item.unit ?? ""}`;
    const staple = isStaple(item.name, pantry);
    return (
      <div className={`ing-row staple-wrap${isChecked(key) ? " tick" : ""}`}>
        <button className="ing-main" role="checkbox" aria-checked={isChecked(key)} onClick={() => toggle(key)}>
          <span className="box">{isChecked(key) ? "✓" : ""}</span>
          <span className="nm">{item.name}</span>
          <span className="for">
            {item.recipeIds.map((id) => <span key={id} className="d" style={{ background: colorFor(id) }} title={id} />)}
          </span>
          <span className="amt">{displayAmount(item.amount, item.unit, item.toTaste, metric)}</span>
        </button>
        {onToggleStaple && (
          <button
            className={`staple-toggle${staple ? " on" : ""}`}
            aria-pressed={staple}
            aria-label={`${staple ? "Remove" : "Mark"} ${item.name} as always-have`}
            title="I always have this"
            onClick={(e) => { e.stopPropagation(); onToggleStaple(item.name); }}
          >🏠</button>
        )}
      </div>
    );
  };

  return (
    <section className="zone" aria-label="Shopping list">
      <h2 className="zone-h"><span>Shopping list</span></h2>
      <div className="subtabs">
        <button className={`subtab${mode === "combined" ? " on" : ""}`} onClick={() => setMode("combined")}>Combined</button>
        <button className={`subtab${mode === "separate" ? " on" : ""}`} onClick={() => setMode("separate")}>By dish</button>
      </div>

      {mode === "combined" ? (
        <>
          <h3 className="meal-sec">To buy{toBuy.length ? ` (${toBuy.length})` : ""}</h3>
          <div className="ing-sec card-grid ing-grid">
            {toBuy.length ? toBuy.map((item) => <ItemRow key={`c|${item.name}|${item.unit ?? ""}`} item={item} />)
              : <div className="idle">All set — everything's in your pantry.</div>}
          </div>
          {staples.length > 0 && (
            <>
              <h3 className="meal-sec pantry-sec">In your pantry ({staples.length})</h3>
              <div className="ing-sec card-grid ing-grid pantry-grid">
                {staples.map((item) => <ItemRow key={`c|${item.name}|${item.unit ?? ""}`} item={item} />)}
              </div>
            </>
          )}
        </>
      ) : (
        recipes.map((r) => {
          const names: { raw: string; amount?: number; unit?: string }[] = [];
          const seen = new Set<string>();
          for (const n of r.nodes)
            for (const ing of n.ingredients) {
              const k = `${normalizeIngredientName(ing.name)}|${ing.unit ?? ""}`;
              if (seen.has(k)) continue;
              seen.add(k);
              names.push({ raw: normalizeIngredientName(ing.name), amount: ing.amount, unit: ing.unit });
            }
          return (
            <div className="ing-sec" key={r.recipeId}>
              <div className="ing-title"><span className="sw" style={{ background: colorFor(r.recipeId) }} /> {r.name}</div>
              <div className="card-grid ing-grid">
              {names.map((item, i) => {
                const key = `s|${r.recipeId}|${item.raw}|${item.unit ?? ""}`;
                return (
                  <button key={key + i} className={`ing-row${isChecked(key) ? " tick" : ""}`} role="checkbox" aria-checked={isChecked(key)} onClick={() => toggle(key)}>
                    <span className="box">{isChecked(key) ? "✓" : ""}</span>
                    <span className="nm">{item.raw}</span>
                    <span className="amt">{displayAmount(item.amount, item.unit, item.amount === undefined, metric)}</span>
                  </button>
                );
              })}
              </div>
            </div>
          );
        })
      )}

      <button className="btn ghost" style={{ marginTop: 14 }} onClick={onShare}>📤 Share list</button>
      <button className="btn ghost no-print" onClick={() => { if (typeof window !== "undefined") window.print(); }}>🖨 Print</button>
      {shareMsg && <p className="hint" aria-live="polite">{shareMsg}</p>}
      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
