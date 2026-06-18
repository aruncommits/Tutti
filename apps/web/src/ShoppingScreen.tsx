import { useState } from "react";
import { buildShoppingList, normalizeIngredientName, type RecipeGraph } from "@tutti/engine";
import { usePersistentState } from "./state";
import { colorFor } from "./dishColors";
import { formatShoppingList, shareOrCopy, type ShareResult } from "./share";

const SHARE_MSG: Record<ShareResult, string> = {
  shared: "Shared ✓",
  copied: "Copied to clipboard ✓",
  failed: "Couldn't share — select the text to copy it",
};

// Consolidated shopping list (Doc 6; Brief v4 item 4). Combined = one merged list across dishes;
// Separate = grouped per dish. Check-off persists. Dish color dots show who needs each line.

const fmtAmount = (amount?: number, unit?: string, toTaste?: boolean) =>
  amount !== undefined ? `${amount}${unit ? ` ${unit}` : ""}` : toTaste ? "to taste" : "";

export function ShoppingScreen({ recipes, onBack }: { recipes: RecipeGraph[]; onBack: () => void }) {
  const [mode, setMode] = usePersistentState<"combined" | "separate">("tutti.shoppingMode", "combined");
  const [checked, setChecked] = usePersistentState<string[]>("tutti.shoppingChecked", []);
  const isChecked = (key: string) => checked.includes(key);
  const toggle = (key: string) => setChecked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const combined = buildShoppingList(recipes);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const onShare = async () => {
    const text = formatShoppingList(combined.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit, toTaste: i.toTaste })));
    setShareMsg(SHARE_MSG[await shareOrCopy("Tutti shopping list", text)]);
  };

  return (
    <section className="zone" aria-label="Shopping list">
      <h2 className="zone-h"><span>Shopping list</span></h2>
      <div className="subtabs">
        <button className={`subtab${mode === "combined" ? " on" : ""}`} onClick={() => setMode("combined")}>Combined</button>
        <button className={`subtab${mode === "separate" ? " on" : ""}`} onClick={() => setMode("separate")}>By dish</button>
      </div>

      {mode === "combined" ? (
        <div className="ing-sec card-grid ing-grid">
          {combined.map((item) => {
            const key = `c|${item.name}|${item.unit ?? ""}`;
            return (
              <button key={key} className={`ing-row${isChecked(key) ? " tick" : ""}`} role="checkbox" aria-checked={isChecked(key)} onClick={() => toggle(key)}>
                <span className="box">{isChecked(key) ? "✓" : ""}</span>
                <span className="nm">{item.name}</span>
                <span className="for">
                  {item.recipeIds.map((id) => <span key={id} className="d" style={{ background: colorFor(id) }} title={id} />)}
                </span>
                <span className="amt">{fmtAmount(item.amount, item.unit, item.toTaste)}</span>
              </button>
            );
          })}
        </div>
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
                    <span className="amt">{fmtAmount(item.amount, item.unit, item.amount === undefined)}</span>
                  </button>
                );
              })}
              </div>
            </div>
          );
        })
      )}

      <button className="btn ghost" style={{ marginTop: 14 }} onClick={onShare}>📤 Share list</button>
      {shareMsg && <p className="hint" aria-live="polite">{shareMsg}</p>}
      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
