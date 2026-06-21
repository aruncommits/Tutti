import { useEffect, useState } from "react";
import { formatClock, parseClock, type MasterExecutionPlan, type RecipeGraph } from "@tutti/engine";
import { colorFor, dishName } from "./dishColors";
import { ExpandText, useAccordion } from "./Expandable";
import { highlightIngredients } from "./ingredientColor";

// Plan preview (Doc 7 §7): a confidence-builder shown once before cooking. The horizontal
// timeline VISUALIZES interleaving — active tasks sitting inside another dish's passive window —
// which is exactly what competitors that ignore hands-as-a-resource cannot show.

const hhmm = (clock: string) => formatClock(parseClock(clock)).slice(0, 5);

export function PreviewScreen({
  plan,
  recipes = [],
  onReorder,
  onStart,
  onEdit,
  onShare,
}: {
  plan: MasterExecutionPlan;
  recipes?: RecipeGraph[];
  onReorder?: (nodeIds: string[]) => void;
  onStart: () => void;
  onEdit: () => void;
  onShare?: () => void;
}) {
  const acc = useAccordion();
  // The dishes this plan cooks: distinct recipeIds (first-seen order) → name + how many steps.
  const nameOf = (id: string) => recipes.find((r) => r.recipeId === id)?.name ?? dishName(id);
  const dishes: { id: string; name: string; steps: number }[] = [];
  for (const n of plan.nodes) {
    const found = dishes.find((d) => d.id === n.recipeId);
    if (found) found.steps++;
    else dishes.push({ id: n.recipeId, name: nameOf(n.recipeId), steps: 1 });
  }
  const start = parseClock(plan.startTime);
  const total = Math.max(1, parseClock(plan.projectedServeTime) - start);
  const byStart = (ids: string[]) =>
    [...ids].sort((a, b) => parseClock(plan.schedule[a]!.plannedStart) - parseClock(plan.schedule[b]!.plannedStart));
  const byId = new Map(plan.nodes.map((n) => [n.nodeId, n]));
  // Local display order: starts as the engine's time order, then follows the user's reordering so a
  // nudge is immediately visible (the bar still shows the real computed time). Re-syncs only when the
  // set of steps changes (a different plan), not on every recompile.
  const idsKey = [...plan.nodes.map((n) => n.nodeId)].sort().join(",");
  const [order, setOrder] = useState<string[]>(() => byStart(plan.nodes.map((n) => n.nodeId)));
  useEffect(() => { setOrder(byStart(plan.nodes.map((n) => n.nodeId))); /* eslint-disable-next-line */ }, [idsKey]);
  const rows = order.map((id) => byId.get(id)).filter((n): n is NonNullable<typeof n> => !!n);
  const voices = new Set(plan.nodes.map((n) => n.recipeId)).size;

  return (
    <section className="zone" aria-label="Your plan">
      <h2 className="zone-h"><span>Your timeline · ready {hhmm(plan.projectedServeTime)}</span></h2>
      <p className="value">Start at <b>{hhmm(plan.startTime)}</b> and every dish finishes together at <b>{hhmm(plan.projectedServeTime)}</b>.</p>

      <p className="tempo">
        {/* The headline duration is the actual makespan (start → serve), matching the times above
            and the Home estimate — not criticalPathMins, which ignores the cook/burner contention
            that sets the real schedule length. */}
        <span className="beat">About {total} min · {voices} dishes</span>
      </p>

      <div className="plan-dishes" aria-label="Dishes in this plan">
        {dishes.map((d) => (
          <span className="plan-dish" key={d.id}>
            <span className="swatch" style={{ background: colorFor(d.id) }} />
            {d.name}
            <span className="pd-count">{d.steps} {d.steps === 1 ? "step" : "steps"}</span>
          </span>
        ))}
      </div>

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

      {onReorder && rows.length > 1 && (
        <>
          <h3 className="meal-sec">Your order</h3>
          <p className="hint">Nudge a step up or down to cook it sooner or later. Tutti keeps every dish finishing together and never starts a step before its prerequisite.</p>
          <div className="editor-list">
            {rows.map((n, i) => {
              const move = (dir: -1 | 1) => {
                const ids = rows.map((r) => r.nodeId);
                const j = i + dir;
                if (j < 0 || j >= ids.length) return;
                [ids[i], ids[j]] = [ids[j]!, ids[i]!];
                setOrder(ids); // reflect the move immediately
                onReorder(ids); // recompile timings honoring the new order where feasible
              };
              return (
                <div className="editor-row" key={n.nodeId}>
                  <span className="editor-num">{i + 1}.</span>
                  <span className="swatch" style={{ background: colorFor(n.recipeId) }} />
                  <ExpandText text={highlightIngredients(n.instruction ?? n.title)} open={acc.isOpen(n.nodeId)} onToggle={() => acc.toggle(n.nodeId)} />
                  <span className="editor-move">
                    <button className="mini-btn" aria-label={`Move step ${i + 1} earlier`} disabled={i === 0} onClick={() => move(-1)}>↑</button>
                    <button className="mini-btn" aria-label={`Move step ${i + 1} later`} disabled={i === rows.length - 1} onClick={() => move(1)}>↓</button>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="value finale-line">✓ All dishes ready together at {hhmm(plan.projectedServeTime)}</p>
      <div className="act">
        <button className="btn" onClick={onStart}>Start cooking</button>
        <button className="btn ghost" onClick={onEdit}>Edit</button>
      </div>
      <p className="hint" aria-live="polite">✓ Saved to your meals</p>
      <div className="home-links">
        {onShare && <button className="link" onClick={onShare}>Share plan</button>}
      </div>
    </section>
  );
}
