import { useMemo, useState } from "react";
import { allergensOf, dishIdOf, formatClock, mealNutrition, parseClock, tierOf, variantsForDish, type ComplexityTier, type RecipeGraph } from "@tutti/engine";
import { colorFor } from "./dishColors";
import { RecipePicker } from "./RecipePicker";
import { NutritionStrip } from "./NutritionStrip";
import type { MealFit } from "./mealFit";
import type { NotesMap } from "./recipeNotes";

// The meal-plan builder — Tutti's opening screen. Add any recipes (search / paste / ask AI),
// see your plan, then Build. Serve time is optional (ASAP by default). No forced steps.

const hhmm = (clock: string) => formatClock(parseClock(clock)).slice(0, 5);
const soloMinutes = (r: RecipeGraph) => r.nodes.reduce((s, n) => s + n.duration.estMins, 0);
const FACTORS = [1, 2, 3];
const TIER_LABEL: Record<ComplexityTier, string> = { simple: "Simple", moderate: "Standard", complex: "Elaborate" };

function ServeTimeOption({
  serveAt,
  onServeAt,
  earliestServe,
  feasible,
}: {
  serveAt: string | null;
  onServeAt: (c: string | null) => void;
  earliestServe: string;
  feasible: boolean;
}) {
  return (
    <div className="serve-opt">
      {serveAt === null ? (
        <button className="link" onClick={() => onServeAt(earliestServe)}>⏰ Serve at a specific time?</button>
      ) : (
        <div className="serve-opt-row">
          <span className="kp-label">Serve at</span>
          <input
            className="time-input time-input-sm"
            type="time"
            value={hhmm(serveAt)}
            aria-label="Target serve time"
            onChange={(e) => onServeAt(`${e.target.value}:00`)}
          />
          <button className="link" onClick={() => onServeAt(null)}>Cook ASAP instead</button>
        </div>
      )}
      {serveAt && !feasible && <p className="hint">That's sooner than possible — the earliest you can serve is {hhmm(earliestServe)}.</p>}
    </div>
  );
}

export function Builder({
  selected,
  factorOf,
  onSetFactor,
  onRemove,
  peopleTarget,
  onPeople,
  serveAt,
  onServeAt,
  soloMins,
  interleavedMins,
  feasible,
  earliestServe,
  onBuild,
  onPaste,
  onAskAI,
  onBrowseAll,
  libraryCount,
  library,
  candidates,
  notes,
  photos,
  avoid,
  diets,
  selectedIds,
  onPick,
  onDetails,
  onRemoveCandidate,
  onSetTier,
  onShopping,
  cookLive,
  fit,
}: {
  selected: RecipeGraph[];
  factorOf: (id: string) => number;
  onSetFactor: (id: string, f: number) => void;
  onRemove: (id: string) => void;
  peopleTarget: number;
  onPeople: (n: number) => void;
  serveAt: string | null;
  onServeAt: (c: string | null) => void;
  soloMins: number;
  interleavedMins: number;
  feasible: boolean;
  earliestServe: string;
  onBuild: () => void;
  onPaste: () => void;
  onAskAI: () => void;
  onBrowseAll?: () => void;
  libraryCount?: number | null;
  library: RecipeGraph[];
  candidates: RecipeGraph[];
  notes: NotesMap;
  photos: Record<string, string>;
  avoid: string[];
  diets: string[];
  selectedIds: string[];
  onPick: (r: RecipeGraph) => void;
  onDetails: (r: RecipeGraph) => void;
  onRemoveCandidate?: (recipeId: string) => void;
  onSetTier: (dishId: string, tier: ComplexityTier) => void;
  onShopping: () => void;
  cookLive: boolean;
  fit: MealFit;
}) {
  // The recipe picker (search / recents / cuisine→dish) lives inline so you discover and add
  // without leaving the plan. Open by default when the plan is empty — that's the first job.
  const [picking, setPicking] = useState(selected.length === 0);
  // Rebuilding while a cook is live would discard its progress — require a deliberate second tap.
  const [armedBuild, setArmedBuild] = useState(false);
  const handleBuild = () => {
    if (cookLive && !armedBuild) { setArmedBuild(true); return; }
    setArmedBuild(false);
    onBuild();
  };

  // All recipes (every tier) so each plan row can offer its dish's simple/standard/elaborate switch.
  const pool = useMemo(() => {
    const m = new Map<string, RecipeGraph>();
    for (const r of [...library, ...candidates]) m.set(r.recipeId, r);
    return [...m.values()];
  }, [library, candidates]);

  return (
    <section className="zone" aria-label="Plan a meal">
      <h2 className="zone-h"><span>Plan a meal</span>{selected.length > 0 && <span className="count">{selected.length}</span>}</h2>

      <div className="add-row">
        <button className={`add-action${picking ? " on" : ""}`} aria-pressed={picking} aria-expanded={picking} onClick={() => setPicking((p) => !p)}><span className="add-ico" aria-hidden="true">🔍</span>Find recipes</button>
        <button className="add-action" onClick={onPaste}><span className="add-ico" aria-hidden="true">📋</span>Paste a recipe</button>
        <button className="add-action" onClick={onAskAI}><span className="add-ico" aria-hidden="true">✨</span>Ask AI</button>
      </div>

      {picking && onBrowseAll && (
        <button className="browse-all-cta" onClick={onBrowseAll}>
          🍴 Browse the full library{libraryCount ? ` — ${libraryCount} dishes` : ""} →
        </button>
      )}

      {picking && (
        <RecipePicker
          library={library}
          candidates={candidates}
          notes={notes}
          photos={photos}
          avoid={avoid}
          diets={diets}
          selectedIds={selectedIds}
          onPick={onPick}
          onDetails={onDetails}
          onRemove={onRemoveCandidate}
        />
      )}

      {selected.length === 0 ? (
        <div className="idle"><b>Your meal plan is empty.</b> Search the library, paste a recipe, or ask AI to add your first dish — then build a plan that has everything ready together.</div>
      ) : (
        <>
          <h3 className="meal-sec">Your meal plan</h3>
          {selected.length > 1 && (
            <div className="kp-row" style={{ marginBottom: 10 }}>
              <span className="kp-label">Cooking for</span>
              <div className="kp-stepper">
                <button aria-label="Fewer people" onClick={() => onPeople(peopleTarget - 1)} disabled={peopleTarget <= 1}>−</button>
                <span className="kp-val" aria-live="polite">{peopleTarget} {peopleTarget === 1 ? "person" : "people"}</span>
                <button aria-label="More people" onClick={() => onPeople(peopleTarget + 1)} disabled={peopleTarget >= 40}>+</button>
              </div>
            </div>
          )}

          <div className="card-grid">
            {selected.map((r) => {
              const factor = factorOf(r.recipeId);
              const dishId = dishIdOf(r);
              const variants = variantsForDish(pool, dishId);
              const current = tierOf(r);
              return (
                <div key={r.recipeId} className="pick-row on">
                  <div className="pick-main plan-main">
                    <span className="swatch" style={{ background: colorFor(r.recipeId) }} />
                    <span className="node-title">{r.name}</span>
                    {(() => {
                      const hits = avoid.length ? allergensOf(r).filter((a) => avoid.includes(a)) : [];
                      return hits.length > 0 ? <span className="badge-allergen" title="may contain">⚠ {hits.join(", ")}</span> : null;
                    })()}
                    <span className="dur">{soloMinutes(r)}m</span>
                    <button className="row-x" aria-label={`Remove ${r.name}`} onClick={() => onRemove(r.recipeId)}>×</button>
                  </div>
                  {variants.length > 1 && (
                    <div className="tier-toggle" role="group" aria-label={`How involved — ${r.name}`}>
                      {variants.map((v) => {
                        const t = tierOf(v);
                        const on = v.recipeId === r.recipeId;
                        return (
                          <button key={t} className={`tier-btn${on ? " on" : ""}`} aria-pressed={on} title={v.variantLabel ?? TIER_LABEL[t]} onClick={() => onSetTier(dishId, t)}>{TIER_LABEL[t]}</button>
                        );
                      })}
                    </div>
                  )}
                  <div className="serve-scale" aria-label={`Servings for ${r.name}`}>
                    <span className="serve-label">serves {Math.round(r.servings * factor)}{factor !== 1 ? " · seasoning adjusted" : ""}</span>
                    <span className="scale-btns">
                      {FACTORS.map((f) => (
                        <button key={f} className={`scale-btn${factor === f ? " on" : ""}`} aria-pressed={factor === f} onClick={() => onSetFactor(r.recipeId, f)}>{f}×</button>
                      ))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="delta">
            <span className="strike">{soloMins} min separately</span>
            <span className="arrow">→</span>
            <b>~{interleavedMins} min with Tutti ⚡</b>
          </div>

          <NutritionStrip nutrition={mealNutrition(selected)} label="Per person" />

          {fit.verdict !== "fits" && (
            <p className={`meal-fit ${fit.verdict}`} role="status">{fit.verdict === "over" ? "⛔ " : "⚠ "}{fit.hint}</p>
          )}

          <ServeTimeOption serveAt={serveAt} onServeAt={onServeAt} earliestServe={earliestServe} feasible={feasible} />

          {cookLive && armedBuild && (
            <p className="meal-fit over" role="status">⚠ You're still cooking — building a new plan discards that progress. Tap Build again to confirm, or use the Resume bar to go back.</p>
          )}
          <button className={`btn big-btn${cookLive && armedBuild ? " danger" : ""}`} onClick={handleBuild}>
            {cookLive && armedBuild ? "Discard cook & build" : `Build plan${serveAt ? ` · serve ${hhmm(serveAt)}` : " · ready ASAP"}`}
          </button>
          <div className="home-links"><button className="link" onClick={onShopping}>🛒 Shopping list</button></div>
        </>
      )}
    </section>
  );
}
