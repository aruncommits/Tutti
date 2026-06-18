import { allergensOf, formatClock, parseClock, type RecipeGraph } from "@tutti/engine";

// Pick dishes (Doc 7 §5) + Set serve time (Doc 7 §6). The "X min separately -> Y min with Tutti"
// delta is the value proposition shown before the user commits.

const hhmm = (clock: string) => formatClock(parseClock(clock)).slice(0, 5);
const soloMinutes = (r: RecipeGraph) => r.nodes.reduce((s, n) => s + n.duration.estMins, 0);

export function PickScreen({
  recipes,
  selected,
  onToggle,
  soloMins,
  interleavedMins,
  onAdd,
  onShopping,
  avoid,
  factorOf,
  onSetFactor,
  onNext,
}: {
  recipes: RecipeGraph[];
  selected: string[];
  onToggle: (id: string) => void;
  soloMins: number;
  interleavedMins: number;
  onAdd: () => void;
  onShopping: () => void;
  avoid: string[];
  factorOf: (id: string) => number;
  onSetFactor: (id: string, f: number) => void;
  onNext: () => void;
}) {
  const FACTORS = [1, 2, 3];
  return (
    <section className="zone" aria-label="Pick your dishes">
      <h2 className="zone-h"><span>Pick your dishes</span><span className="count">{selected.length}</span></h2>
      {recipes.map((r) => {
        const on = selected.includes(r.recipeId);
        const hits = avoid.length ? allergensOf(r).filter((a) => avoid.includes(a)) : [];
        const factor = factorOf(r.recipeId);
        return (
          <div key={r.recipeId} className={`pick-row${on ? " on" : ""}`}>
            <button className="pick-main" role="checkbox" aria-checked={on} onClick={() => onToggle(r.recipeId)}>
              <span className="pick-box">{on ? "✓" : ""}</span>
              <span className="node-title">{r.name}</span>
              {hits.length > 0 && <span className="badge-allergen" title="may contain">⚠ {hits.join(", ")}</span>}
              {!r.verified && <span className="badge-unverified">unverified</span>}
              <span className="dur">{soloMinutes(r)}m</span>
            </button>
            <div className="serve-scale" aria-label={`Servings for ${r.name}`}>
              <span className="serve-label">serves {Math.round(r.servings * factor)}{factor !== 1 ? " · seasoning adjusted" : ""}</span>
              <span className="scale-btns">
                {FACTORS.map((f) => (
                  <button key={f} className={`scale-btn${factor === f ? " on" : ""}`} aria-pressed={factor === f}
                    onClick={(e) => { e.stopPropagation(); onSetFactor(r.recipeId, f); }}>
                    {f}×
                  </button>
                ))}
              </span>
            </div>
          </div>
        );
      })}
      <button className="add-dish" onClick={onAdd}>+ Add a dish (paste · find online · AI)</button>
      {selected.length > 0 && (
        <div className="delta">
          <span className="strike">{soloMins} min separately</span>
          <span className="arrow">→</span>
          <b>~{interleavedMins} min with Tutti ⚡</b>
        </div>
      )}
      <button className="btn big-btn" disabled={selected.length === 0} onClick={onNext}>
        Set serve time
      </button>
      <div className="home-links">
        <button className="link" onClick={onShopping}>🛒 Shopping list</button>
      </div>
    </section>
  );
}

export function ServeTimeScreen({
  target,
  onChange,
  startTime,
  feasible,
  earliestServe,
  onBuild,
  cooks,
  onCooks,
  soonerMins,
}: {
  target: string;
  onChange: (clock: string) => void;
  startTime: string;
  feasible: boolean;
  earliestServe: string;
  onBuild: () => void;
  cooks: number;
  onCooks: (n: number) => void;
  soonerMins: number | null;
}) {
  return (
    <section className="zone" aria-label="When do you want to eat?">
      <h2 className="zone-h"><span>When do you want to eat?</span></h2>
      <input
        className="time-input"
        type="time"
        value={hhmm(target)}
        aria-label="Target serve time"
        onChange={(e) => onChange(`${e.target.value}:00`)}
      />
      {feasible ? (
        <p className="value">To serve at <b>{hhmm(target)}</b>, you'll start at <b>{hhmm(startTime)}</b>.</p>
      ) : (
        <p className="alert">That's not enough time — the earliest you can serve is <b>{hhmm(earliestServe)}</b>.</p>
      )}

      {/* Cooking with help: more hands re-schedule the meal in parallel (Doc 2 §4, Brief v13). */}
      <div className="kp-row" style={{ marginTop: 4 }}>
        <span className="kp-label">Cooking with help?</span>
        <div className="kp-stepper">
          <button aria-label="Fewer cooks" onClick={() => onCooks(cooks - 1)} disabled={cooks <= 1}>−</button>
          <span className="kp-val" aria-live="polite">{cooks} {cooks === 1 ? "pair of hands" : "pairs of hands"}</span>
          <button aria-label="More cooks" onClick={() => onCooks(cooks + 1)} disabled={cooks >= 4}>+</button>
        </div>
      </div>
      {cooks > 1 && soonerMins !== null && (
        <p className="value">
          {soonerMins > 0
            ? <>🙌 With {cooks} pairs of hands, the meal takes <b>{soonerMins} min less</b> than cooking solo.</>
            : <>With extra hands it's about the same — this meal can't split up much.</>}
        </p>
      )}

      <button className="btn big-btn" onClick={onBuild}>Build my plan</button>
    </section>
  );
}
