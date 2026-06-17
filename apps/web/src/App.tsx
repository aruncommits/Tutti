import { useMemo, useState } from "react";
import {
  compile,
  deriveViewState,
  formatClock,
  parseClock,
  thaliV1,
  type MasterExecutionPlan,
  type TaskNode,
} from "@tutti/engine";

// Cook Mode now renders genuine engine output: compile() -> MasterExecutionPlan ->
// deriveViewState() three-tier NOW / NEXT / DONE (Doc 2 §5.2, Doc 7 §8). Tap-to-Done sets a
// node completed and re-derives. (applyEvent + live reschedule arrive in Brief v1 items 7-8.)

const DISH_COLORS: Record<string, string> = {
  rec_rice: "#5aa6ff",
  rec_kuzhambu: "#ff8a5b",
  rec_poriyal: "#86cf4d",
};
const DISH_NAMES: Record<string, string> = {
  rec_rice: "Rice",
  rec_kuzhambu: "Kuzhambu",
  rec_poriyal: "Poriyal",
};

const hhmm = (clock: string) => formatClock(parseClock(clock)).slice(0, 5);

function Measures({ node }: { node: TaskNode }) {
  if (!node.ingredients.length) return null;
  return (
    <div className="measure">
      {node.ingredients.map((ing, i) => (
        <span className="chip" key={i}>
          {ing.amount !== undefined && <b>{ing.amount}{ing.unit ? ` ${ing.unit}` : ""}</b>} {ing.name}
        </span>
      ))}
    </div>
  );
}

function Tag({ node }: { node: TaskNode }) {
  return (
    <span className="tag">
      <span className="swatch" style={{ background: DISH_COLORS[node.recipeId] ?? "var(--accent)" }} />
      {DISH_NAMES[node.recipeId] ?? node.recipeId}
    </span>
  );
}

export function App() {
  const initial = useMemo<MasterExecutionPlan>(
    () => compile(thaliV1.recipes, thaliV1.kitchenProfile, thaliV1.targetServeTime),
    [],
  );
  const [plan, setPlan] = useState<MasterExecutionPlan>(initial);
  const view = deriveViewState(plan);

  const complete = (id: string) =>
    setPlan((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.nodeId === id ? { ...n, status: "completed" as const } : n)),
    }));
  const reset = () => setPlan(initial);

  const allDone = view.active.length === 0 && view.queue.length === 0;

  return (
    <div className="wrap">
      <header>
        <div className="logo">
          <div className="mark">T</div>
          <div className="brand">
            Tutti
            <small>cook the whole meal, together</small>
          </div>
        </div>
      </header>

      <div className="clock" role="status">
        <div>
          <div className="lbl">Serving at</div>
          <div className="time">{hhmm(view.projectedServeTime)}</div>
        </div>
        <div className="status">
          <span className="dot" /> start {hhmm(plan.startTime)}
        </div>
      </div>

      <p className="value">
        <b>{thaliV1.recipes.length} dishes</b> · <span className="strike">91 min separately</span> →{" "}
        <b>{plan.criticalPathMins}+ min interleaved</b>
      </p>

      <section className="zone" aria-label="NOW">
        <h2 className="zone-h"><span>NOW</span></h2>
        {allDone ? (
          <div className="finale">
            <div className="big">Dinner is served</div>
            <button className="btn" onClick={reset}>Cook it again</button>
          </div>
        ) : view.active.length ? (
          view.active.map((n) => (
            <div className={n.attention === "passive" ? "now-card passive" : "now-card"} key={n.nodeId}>
              <div className="now-head">
                <Tag node={n} />
                <span className="phase">{n.phase}{n.attention === "passive" ? " · hands-free" : ""}</span>
              </div>
              <div className="now-title">{n.title}</div>
              <Measures node={n} />
              <div className="act">
                {n.attention === "passive" ? (
                  <span className="cooking-label">⏲ runs itself · ~{n.duration.estMins}m</span>
                ) : (
                  <button className="btn" onClick={() => complete(n.nodeId)} aria-label={`Mark "${n.title}" done`}>
                    ✓ Done
                  </button>
                )}
                <span className="dur">~{n.duration.estMins} min</span>
              </div>
            </div>
          ))
        ) : (
          <div className="idle"><b>Hands free.</b> Something's cooking — relax a moment.</div>
        )}
      </section>

      <section className="zone" aria-label="NEXT">
        <h2 className="zone-h"><span>NEXT</span><span className="count">{view.queue.length}</span></h2>
        {view.queue.map((n) => (
          <div className="q-item" key={n.nodeId}>
            <span className="swatch" style={{ background: DISH_COLORS[n.recipeId] ?? "var(--accent)" }} />
            <span className="node-title">{n.title}</span>
            <span className="dur">~{n.duration.estMins}m</span>
          </div>
        ))}
      </section>

      <section className="zone" aria-label="DONE">
        <h2 className="zone-h"><span>DONE</span><span className="count">{view.archive.length}</span></h2>
        {view.archive.map((n) => (
          <div className="done-card" key={n.nodeId}>
            <s>{n.title}</s>
          </div>
        ))}
      </section>

      <footer className="scaffold-note">
        Rendering real engine output · compile() → deriveViewState() · live reschedule &amp; voice
        arrive in later briefs.
      </footer>
    </div>
  );
}
