import {
  deriveViewState,
  formatClock,
  parseClock,
  type MasterExecutionPlan,
  type TaskNode,
} from "@tutti/engine";

// Pure render of the engine's three-tier ViewState (Doc 2 §5.2, Doc 7 §8). Receives the plan and
// reports completions back up; holds no scheduling logic of its own.

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

export function CookScreen({
  plan,
  onComplete,
  onReset,
}: {
  plan: MasterExecutionPlan;
  onComplete: (id: string) => void;
  onReset: () => void;
}) {
  const view = deriveViewState(plan);
  const allDone = view.active.length === 0 && view.queue.length === 0;

  return (
    <>
      <div className="clock" role="status">
        <div>
          <div className="lbl">Serving at</div>
          <div className={`time${plan.runningLate ? " late" : ""}`}>{hhmm(view.projectedServeTime)}</div>
        </div>
        <div className="status">
          <span className="dot" /> {plan.runningLate ? "running late" : `start ${hhmm(plan.startTime)}`}
        </div>
      </div>

      {view.nextStartAlert && <p className="alert">{view.nextStartAlert}</p>}

      <section className="zone" aria-label="NOW">
        <h2 className="zone-h"><span>NOW</span></h2>
        {allDone ? (
          <div className="finale">
            <div className="big">Dinner is served</div>
            <button className="btn" onClick={onReset}>Cook it again</button>
          </div>
        ) : view.active.length ? (
          view.active.map((n) => (
            <div className={n.attention === "passive" ? "now-card passive" : "now-card"} key={n.nodeId}>
              <div className="now-head">
                <span className="tag">
                  <span className="swatch" style={{ background: DISH_COLORS[n.recipeId] ?? "var(--accent)" }} />
                  {DISH_NAMES[n.recipeId] ?? n.recipeId}
                </span>
                <span className="phase">{n.phase}{n.attention === "passive" ? " · hands-free" : ""}</span>
              </div>
              <div className="now-title">{n.title}</div>
              <Measures node={n} />
              <div className="act">
                {n.attention === "passive" ? (
                  <span className="cooking-label">⏲ runs itself · ~{n.duration.estMins}m</span>
                ) : (
                  <button className="btn" onClick={() => onComplete(n.nodeId)} aria-label={`Mark "${n.title}" done`}>
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
          <div className="done-card" key={n.nodeId}><s>{n.title}</s></div>
        ))}
      </section>
    </>
  );
}
