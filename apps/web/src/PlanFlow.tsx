import { formatClock, parseClock, type RecipeGraph } from "@tutti/engine";

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
  onNext,
}: {
  recipes: RecipeGraph[];
  selected: string[];
  onToggle: (id: string) => void;
  soloMins: number;
  interleavedMins: number;
  onAdd: () => void;
  onShopping: () => void;
  onNext: () => void;
}) {
  return (
    <section className="zone" aria-label="Pick your dishes">
      <h2 className="zone-h"><span>Pick your dishes</span><span className="count">{selected.length}</span></h2>
      {recipes.map((r) => {
        const on = selected.includes(r.recipeId);
        return (
          <button
            key={r.recipeId}
            className={`pick-row${on ? " on" : ""}`}
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(r.recipeId)}
          >
            <span className="pick-box">{on ? "✓" : ""}</span>
            <span className="node-title">{r.name}</span>
            {!r.verified && <span className="badge-unverified">unverified</span>}
            <span className="dur">{soloMinutes(r)}m</span>
          </button>
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
}: {
  target: string;
  onChange: (clock: string) => void;
  startTime: string;
  feasible: boolean;
  earliestServe: string;
  onBuild: () => void;
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
      <button className="btn big-btn" onClick={onBuild}>Build my plan</button>
    </section>
  );
}
