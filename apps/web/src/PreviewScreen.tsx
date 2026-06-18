import { formatClock, parseClock, type MasterExecutionPlan } from "@tutti/engine";
import { colorFor } from "./dishColors";

// Plan preview (Doc 7 §7): a confidence-builder shown once before cooking. The horizontal
// timeline VISUALIZES interleaving — active tasks sitting inside another dish's passive window —
// which is exactly what competitors that ignore hands-as-a-resource cannot show.

const hhmm = (clock: string) => formatClock(parseClock(clock)).slice(0, 5);

// The meal's pace, named like a score's tempo: a longer movement runs slower. Flavor on
// the timeline, not a claim about the cook — a 45-min thali simply reads as "Andante".
const tempoOf = (mins: number): string =>
  mins < 30 ? "Allegro" : mins < 50 ? "Andante" : mins < 80 ? "Adagio" : "Largo";

export function PreviewScreen({
  plan,
  onStart,
  onEdit,
  onSave,
  onShare,
}: {
  plan: MasterExecutionPlan;
  onStart: () => void;
  onEdit: () => void;
  onSave?: () => void;
  onShare?: () => void;
}) {
  const start = parseClock(plan.startTime);
  const total = Math.max(1, parseClock(plan.projectedServeTime) - start);
  const rows = [...plan.nodes].sort(
    (a, b) => parseClock(plan.schedule[a.nodeId]!.plannedStart) - parseClock(plan.schedule[b.nodeId]!.plannedStart),
  );
  const voices = new Set(plan.nodes.map((n) => n.recipeId)).size;

  return (
    <section className="zone" aria-label="Your plan">
      <h2 className="zone-h"><span>The score · serve {hhmm(plan.projectedServeTime)}</span></h2>
      <p className="value">Start at <b>{hhmm(plan.startTime)}</b> — every voice lands together on the downbeat.</p>

      <p className="tempo">
        {tempoOf(plan.criticalPathMins)}
        <span className="beat">♩ {plan.criticalPathMins}-min movement · {voices} voices</span>
      </p>
      <div className="gantt" role="img" aria-label="Cooking timeline showing dishes interleaved">
        {rows.map((n) => {
          const s = plan.schedule[n.nodeId]!;
          const left = ((parseClock(s.plannedStart) - start) / total) * 100;
          const width = Math.max(2, ((parseClock(s.plannedEnd) - parseClock(s.plannedStart)) / total) * 100);
          const color = colorFor(n.recipeId);
          return (
            <div className="gantt-row" key={n.nodeId}>
              <span className="gantt-label">{n.title}</span>
              <span className="gantt-track">
                <span
                  className={`gantt-bar${n.attention === "passive" ? " passive" : ""}`}
                  style={{ left: `${left}%`, width: `${width}%`, background: color, color }}
                  title={`${hhmm(s.plannedStart)}–${hhmm(s.plannedEnd)} · ${n.attention}`}
                />
              </span>
            </div>
          );
        })}
      </div>

      <p className="value finale-line">✓ All dishes ready together at {hhmm(plan.projectedServeTime)}</p>
      <div className="act">
        <button className="btn" onClick={onStart}>Start cooking</button>
        <button className="btn ghost" onClick={onEdit}>Edit</button>
      </div>
      <div className="home-links">
        {onSave && <button className="link" onClick={onSave}>Save this meal</button>}
        {onShare && <button className="link" onClick={onShare}>Share plan</button>}
      </div>
    </section>
  );
}
