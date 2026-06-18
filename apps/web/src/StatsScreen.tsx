import type { PaceModel } from "@tutti/engine";

// Cooking stats / pace view (Doc 10 Loop A; Brief v6 item 4). Shows what Tutti has learned about
// the cook's pace, the estimate error trend, and full user control: opt-out and "forget" — all
// local, nothing leaves the device.

export interface LearnEvent {
  type: "node_completed";
  recipeId: string;
  nodeId: string;
  category: string;
  plannedMins: number;
  actualMins: number;
  at: number;
}

const phrase = (m: number): string => {
  const pct = Math.round((m - 1) * 100);
  if (Math.abs(pct) < 5) return "about on time";
  return pct > 0 ? `~${pct}% slower` : `~${-pct}% faster`;
};

export function StatsScreen({
  pace,
  events,
  learnPace,
  onToggleLearn,
  onForget,
  onBack,
}: {
  pace: PaceModel;
  events: LearnEvent[];
  learnPace: boolean;
  onToggleLearn: () => void;
  onForget: () => void;
  onBack: () => void;
}) {
  const cats = Object.entries(pace).sort((a, b) => Math.abs(b[1] - 1) - Math.abs(a[1] - 1));
  const mae = events.length
    ? Math.round((events.reduce((a, e) => a + Math.abs(e.plannedMins - e.actualMins), 0) / events.length) * 10) / 10
    : null;

  return (
    <section className="zone" aria-label="Your cooking pace">
      <h2 className="zone-h"><span>Your cooking pace</span></h2>
      <p className="hint">Everything stays on this device. Tutti learns only from your own cooks.</p>

      {cats.length === 0 ? (
        <div className="idle">No pace data yet — cook a meal and Tutti will start tuning your timings.</div>
      ) : (
        <div className="ing-sec">
          {cats.map(([cat, m]) => (
            <div className="ing-row" key={cat}>
              <span className="nm">{cat}</span>
              <span className="amt">{phrase(m)}</span>
            </div>
          ))}
        </div>
      )}

      {mae !== null && (
        <p className="value">Average estimate error: <b>{mae} min</b> across {events.length} timed steps.</p>
      )}

      <div className="kp-row" style={{ marginTop: 12 }}>
        <span className="kp-label">Learn from my cooking</span>
        <button className={`kp-toggle${learnPace ? " on" : ""}`} role="switch" aria-checked={learnPace} aria-label="Learn from my cooking" onClick={onToggleLearn}>
          {learnPace ? "On" : "Off"}
        </button>
      </div>

      <button className="btn ghost" style={{ marginTop: 14 }} onClick={onForget}>Forget my learning</button>
      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
