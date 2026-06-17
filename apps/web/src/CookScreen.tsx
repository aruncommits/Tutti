import { useEffect, useState } from "react";
import {
  deriveViewState,
  formatClock,
  parseClock,
  type MasterExecutionPlan,
  type TaskNode,
} from "@tutti/engine";

// Pure-ish render of the engine's three-tier ViewState (Doc 2 §5.2, Doc 7 §8). The only local
// state is UI-only passive countdown timers; all cooking truth comes from the plan via events.

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
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

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
  onUndo,
  onReset,
}: {
  plan: MasterExecutionPlan;
  onComplete: (id: string) => void;
  onUndo: (id: string) => void;
  onReset: () => void;
}) {
  const view = deriveViewState(plan);
  const allDone = view.active.length === 0 && view.queue.length === 0;

  // UI-only countdowns for passive tasks the cook has started (seconds remaining, floored at 0).
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  const startPassive = (id: string, mins: number) => setRemaining((r) => ({ ...r, [id]: mins * 60 }));
  const complete = (id: string) => {
    setRemaining((r) => { const n = { ...r }; delete n[id]; return n; });
    onComplete(id);
  };

  useEffect(() => {
    if (Object.keys(remaining).length === 0) return;
    const t = setInterval(() => {
      setRemaining((prev) => {
        const next: Record<string, number> = {};
        for (const [id, sec] of Object.entries(prev)) next[id] = Math.max(0, sec - 1);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [remaining]);

  // Keep the screen awake while cooking (Doc 7 §12). Guarded for unsupported browsers.
  useEffect(() => {
    let lock: { release: () => void } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => void }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => { /* unsupported / denied */ });
    return () => { try { lock?.release(); } catch { /* ignore */ } };
  }, []);

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
          view.active.map((n) => {
            const ticking = remaining[n.nodeId];
            const isPassive = n.attention === "passive";
            return (
              <div className={isPassive ? "now-card passive" : "now-card"} key={n.nodeId}>
                <div className="now-head">
                  <span className="tag">
                    <span className="swatch" style={{ background: DISH_COLORS[n.recipeId] ?? "var(--accent)" }} />
                    {DISH_NAMES[n.recipeId] ?? n.recipeId}
                  </span>
                  <span className="phase">{n.phase}{isPassive ? " · hands-free" : ""}</span>
                </div>
                <div className="now-title">{n.title}</div>
                <Measures node={n} />
                <div className="act">
                  {isPassive && ticking === undefined ? (
                    <button className="btn" onClick={() => startPassive(n.nodeId, n.duration.estMins)}>
                      ▶ Start — it cooks itself
                    </button>
                  ) : isPassive ? (
                    <>
                      <span className={`cooking-label${ticking === 0 ? " ready" : ""}`}>
                        {ticking === 0 ? "⏲ ready!" : `⏲ ${mmss(ticking!)} left`}
                      </span>
                      <button className="btn" onClick={() => complete(n.nodeId)} aria-label={`Mark "${n.title}" done`}>✓ Done</button>
                    </>
                  ) : (
                    <button className="btn" onClick={() => complete(n.nodeId)} aria-label={`Mark "${n.title}" done`}>✓ Done</button>
                  )}
                  <span className="dur">~{n.duration.estMins} min</span>
                </div>
              </div>
            );
          })
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
          <button className="done-card" key={n.nodeId} onClick={() => onUndo(n.nodeId)} aria-label={`Undo "${n.title}"`}>
            <s>{n.title}</s> <span className="undo-hint">tap to undo</span>
          </button>
        ))}
      </section>
    </>
  );
}
