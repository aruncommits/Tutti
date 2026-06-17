import { useEffect, useRef, useState } from "react";
import {
  deriveViewState,
  formatClock,
  parseClock,
  type MasterExecutionPlan,
  type TaskNode,
} from "@tutti/engine";
import { colorFor, dishName } from "./dishColors";
import { useSpeech } from "./useSpeech";
import { parseVoiceCommand } from "./voice";

function speak(text: string) {
  const synth = (window as unknown as { speechSynthesis?: { cancel: () => void; speak: (u: unknown) => void } }).speechSynthesis;
  const Utt = (window as unknown as { SpeechSynthesisUtterance?: new (t: string) => unknown }).SpeechSynthesisUtterance;
  if (!synth || !Utt) return;
  try { synth.cancel(); synth.speak(new Utt(text)); } catch { /* ignore */ }
}

// Pure-ish render of the engine's three-tier ViewState (Doc 2 §5.2, Doc 7 §8). The only local
// state is UI-only passive countdown timers; all cooking truth comes from the plan via events.

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
  pro = false,
  onComplete,
  onUndo,
  onReset,
}: {
  plan: MasterExecutionPlan;
  pro?: boolean;
  onComplete: (id: string) => void;
  onUndo: (id: string) => void;
  onReset: () => void;
}) {
  const view = deriveViewState(plan);
  const allDone = view.active.length === 0 && view.queue.length === 0;

  // Guided-not-gated (Doc 7 §9): a gentle nudge — never a wall — when cook steps are ready while
  // prep tasks remain. Pro mode silences it and lets prep/cook interleave without commentary.
  const showNudge =
    !pro && view.active.some((n) => n.phase === "cook") && view.queue.concat(view.active).some((n) => n.phase === "prep");

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

  // Voice control (Doc 7 §11). The on-screen Done button always remains the fallback (§11.2).
  const activeHands = view.active.filter((n) => n.attention === "active"); // the hands-on NOW tasks
  const stopRef = useRef<() => void>(() => {});
  const handleVoice = (transcript: string) => {
    const { type } = parseVoiceCommand(transcript);
    switch (type) {
      case "complete":
      case "next":
        if (activeHands.length === 1) {
          const t = activeHands[0]!;
          complete(t.nodeId);
          speak(`Done. ${activeHands.length > 1 ? "" : ""}`.trim() || "Done");
        } else if (activeHands.length > 1) {
          speak(`Which one — ${activeHands.map((n) => n.title).join(", or ")}?`); // ambiguity asks, never guesses
        } else {
          speak("Nothing to mark done right now.");
        }
        break;
      case "status":
        speak(`Now: ${view.active.map((n) => n.title).join("; ") || "nothing"}. Serving at ${hhmm(view.projectedServeTime)}.`);
        break;
      case "howLong":
        speak(`Serving at ${hhmm(view.projectedServeTime)}.`);
        break;
      case "repeat":
        speak(activeHands[0]?.title ?? view.active[0]?.title ?? "Nothing active.");
        break;
      case "pause":
        stopRef.current();
        break;
      default:
        break;
    }
  };
  const speech = useSpeech(handleVoice);
  stopRef.current = speech.stop;

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
          {speech.supported && (
            <button
              className={`mic${speech.listening ? " on" : ""}`}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Stop voice control" : "Start voice control"}
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
            >
              🎙
            </button>
          )}
        </div>
      </div>
      {speech.supported && speech.listening && (
        <p className="listening" aria-live="polite">
          Listening… say “done”, “what's next”, or “how long”{speech.transcript ? ` · heard: ${speech.transcript}` : ""}
        </p>
      )}

      {view.nextStartAlert && <p className="alert">{view.nextStartAlert}</p>}
      {showNudge && (
        <p className="nudge">Prep's basically done 👍 cook steps are ready — you can keep prepping as you go.</p>
      )}

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
              <div className={isPassive ? "now-card passive" : "now-card"} key={n.nodeId} style={{ borderLeft: `4px solid ${colorFor(n.recipeId)}` }}>
                <div className="now-head">
                  <span className="tag">
                    <span className="swatch" style={{ background: colorFor(n.recipeId) }} />
                    {dishName(n.recipeId)}
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
            <span className="swatch" style={{ background: colorFor(n.recipeId) }} />
            <span className="node-title">{n.title}</span>
            <span className="dur">~{n.duration.estMins}m</span>
          </div>
        ))}
      </section>

      <section className="zone" aria-label="DONE">
        <h2 className="zone-h"><span>DONE</span><span className="count">{view.archive.length}</span></h2>
        {view.archive.map((n) => (
          <button className="done-card" key={n.nodeId} onClick={() => onUndo(n.nodeId)} aria-label={`Undo "${n.title}"`}>
            <span className="swatch" style={{ background: colorFor(n.recipeId) }} />
            <s>{n.title}</s> <span className="undo-hint">tap to undo</span>
          </button>
        ))}
      </section>
    </>
  );
}
