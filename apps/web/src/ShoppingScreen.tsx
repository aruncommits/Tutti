import { useState } from "react";
import { buildShoppingList, normalizeIngredientName, aisleOf, aisleOrder, expandBlendsInRecipe, isBlend, type RecipeGraph } from "@tutti/engine";
import { usePersistentState } from "./state";
import { colorFor } from "./dishColors";
import { formatShoppingList, shareOrCopy, type ShareResult } from "./share";
import { partitionByPantry, isStaple, type Pantry } from "./pantry";
import { displayAmount } from "./units";

const SHARE_MSG: Record<ShareResult, string> = {
  shared: "Shared ✓",
  copied: "Copied to clipboard ✓",
  failed: "Couldn't share — select the text to copy it",
};

// Consolidated shopping list (Doc 6; Brief v4 → v46). Combined = one merged list grouped by store
// aisle; Separate = grouped per dish. Manual items + check-off persist. Pantry items are split out.

interface BuyRow { name: string; unit?: string; amount?: number; toTaste?: boolean; recipeIds: string[]; manual?: boolean }

export function ShoppingScreen({
  recipes,
  onBack,
  onPantry,
  pantry = [],
  metric = false,
  onToggleStaple,
}: {
  recipes: RecipeGraph[];
  onBack: () => void;
  onPantry?: () => void;
  pantry?: Pantry;
  metric?: boolean;
  onToggleStaple?: (name: string) => void;
}) {
  const [mode, setMode] = usePersistentState<"combined" | "separate">("tutti.shoppingMode", "combined");
  const [checked, setChecked] = usePersistentState<string[]>("tutti.shoppingChecked", []);
  const [manual, setManual] = usePersistentState<string[]>("tutti.shopManual", []);
  const [draft, setDraft] = useState("");
  // Blends the shopper chose to make from scratch — their constituent spices replace the jar line.
  const [makeScratch, setMakeScratch] = usePersistentState<string[]>("tutti.shopMakeScratch", []);
  const scratch = new Set(makeScratch);
  const toggleScratch = (name: string) => {
    const n = normalizeIngredientName(name);
    setMakeScratch((m) => (m.includes(n) ? m.filter((x) => x !== n) : [...m, n]));
  };
  const isChecked = (key: string) => checked.includes(key);
  const toggle = (key: string) => setChecked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  // Fold chosen-from-scratch blends into their constituents before consolidating.
  const sourceRecipes = makeScratch.length
    ? recipes.map((r) => expandBlendsInRecipe(r, (n) => scratch.has(normalizeIngredientName(n))))
    : recipes;
  const combined = buildShoppingList(sourceRecipes);
  const { toBuy, staples } = partitionByPantry(combined, pantry);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const addManual = () => { const n = draft.trim(); if (n && !manual.includes(n)) setManual((m) => [...m, n]); setDraft(""); };

  const onShare = async () => {
    const lines = [...toBuy, ...manual.map((name) => ({ name, amount: undefined, unit: undefined, toTaste: false }))];
    const text = formatShoppingList(lines.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit, toTaste: i.toTaste })));
    setShareMsg(SHARE_MSG[await shareOrCopy("Tutti shopping list", text)]);
  };

  // To-buy rows (recipe ingredients + manual), grouped by aisle in walk order.
  const buyRows: BuyRow[] = [
    ...toBuy.map((i) => ({ name: i.name, unit: i.unit, amount: i.amount, toTaste: i.toTaste, recipeIds: i.recipeIds })),
    ...manual.map((name) => ({ name, recipeIds: [] as string[], manual: true })),
  ];
  const byAisle = new Map<string, BuyRow[]>();
  for (const r of buyRows) { const a = aisleOf(r.name); (byAisle.get(a) ?? byAisle.set(a, []).get(a)!).push(r); }
  const aisles = [...byAisle.keys()].sort((a, b) => aisleOrder(a) - aisleOrder(b));

  const Row = ({ item }: { item: BuyRow }) => {
    const key = item.manual ? `m|${item.name}` : `c|${item.name}|${item.unit ?? ""}`;
    const staple = isStaple(item.name, pantry);
    return (
      <div className={`ing-row staple-wrap${isChecked(key) ? " tick" : ""}`}>
        <button className="ing-main" role="checkbox" aria-checked={isChecked(key)} onClick={() => toggle(key)}>
          <span className="box">{isChecked(key) ? "✓" : ""}</span>
          <span className="nm">{item.name}</span>
          <span className="for">
            {item.recipeIds.map((id) => <span key={id} className="d" style={{ background: colorFor(id) }} title={id} />)}
          </span>
          <span className="amt">{item.manual ? "" : displayAmount(item.amount, item.unit, item.toTaste, metric)}</span>
        </button>
        {item.manual ? (
          <button className="row-x" aria-label={`Remove ${item.name}`} onClick={() => setManual((m) => m.filter((x) => x !== item.name))}>×</button>
        ) : (
          <>
            {isBlend(item.name) && (
              <button className="blend-scratch-btn" aria-label={`Make ${item.name} from scratch`} title="Make from scratch instead of buying the jar" onClick={(e) => { e.stopPropagation(); toggleScratch(item.name); }}>🧂</button>
            )}
            {onToggleStaple && (
              <button className={`staple-toggle${staple ? " on" : ""}`} aria-pressed={staple} aria-label={`${staple ? "Remove" : "Mark"} ${item.name} as always-have`} title="I always have this" onClick={(e) => { e.stopPropagation(); onToggleStaple(item.name); }}>🏠</button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <section className="zone" aria-label="Shopping list">
      <h2 className="zone-h"><span>Shopping list</span></h2>
      <div className="subtabs">
        <button className={`subtab${mode === "combined" ? " on" : ""}`} onClick={() => setMode("combined")}>By aisle</button>
        <button className={`subtab${mode === "separate" ? " on" : ""}`} onClick={() => setMode("separate")}>By dish</button>
      </div>

      {mode === "combined" ? (
        <>
          <div className="shop-add">
            <input className="url-input" type="text" value={draft} placeholder="Add an item to buy…" aria-label="Add a shopping item" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addManual(); }} />
            <button className="btn mini" onClick={addManual}>Add</button>
          </div>

          {makeScratch.length > 0 && (
            <p className="scratch-note">
              Making from scratch:{" "}
              {makeScratch.map((n) => (
                <button key={n} className="scratch-chip" title="Buy the jar instead" onClick={() => setMakeScratch((m) => m.filter((x) => x !== n))}>{n} ✕</button>
              ))}
            </p>
          )}

          {buyRows.length === 0 ? (
            <div className="idle">All set — everything's in your pantry.</div>
          ) : (
            aisles.map((a) => (
              <div className="ing-sec" key={a}>
                <h3 className="meal-sec">{a}</h3>
                <div className="card-grid ing-grid">
                  {byAisle.get(a)!.map((item) => <Row key={(item.manual ? "m|" : "c|") + item.name + (item.unit ?? "")} item={item} />)}
                </div>
              </div>
            ))
          )}

          {staples.length > 0 && (
            <>
              <h3 className="meal-sec pantry-sec">In your pantry ({staples.length})</h3>
              <div className="ing-sec card-grid ing-grid pantry-grid">
                {staples.map((item) => <Row key={`c|${item.name}|${item.unit ?? ""}`} item={{ name: item.name, unit: item.unit, amount: item.amount, toTaste: item.toTaste, recipeIds: item.recipeIds }} />)}
              </div>
            </>
          )}
        </>
      ) : (
        sourceRecipes.map((r) => {
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

      <div className="shop-actions">
        <button className="btn ghost" onClick={onShare}>📤 Share list</button>
        <button className="btn ghost no-print" onClick={() => { if (typeof window !== "undefined") window.print(); }}>🖨 Print</button>
        {onPantry && <button className="btn ghost" onClick={onPantry}>🥫 Pantry</button>}
      </div>
      {shareMsg && <p className="hint" aria-live="polite">{shareMsg}</p>}
      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
