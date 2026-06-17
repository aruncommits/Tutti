import { useMemo, useState } from "react";
import { thaliV1, validate, type TaskNode } from "@tutti/engine";

// SCAFFOLD seed of Cook Mode. It renders the three-tier NOW / NEXT / DONE structure
// (Doc 7 §8) from the golden thali so the UX shell + gate markers exist from turn 1.
// Brief v2 replaces this with a real render of engine deriveViewState().

const DISH_COLORS: Record<string, string> = {
  rec_rice: "#5aa6ff",
  rec_kuzhambu: "#ff8a5b",
  rec_poriyal: "#86cf4d",
};

function Zone({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="zone" aria-label={label}>
      <h2 className="zone-h">
        <span>{label}</span>
        {count !== undefined && <span className="count">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function NodeCard({ node, active, onDone }: { node: TaskNode; active: boolean; onDone: () => void }) {
  const color = DISH_COLORS[node.recipeId] ?? "var(--accent)";
  return (
    <div className={active ? "now-card" : "q-item"}>
      <span className="swatch" style={{ background: color }} />
      <span className="node-title">{node.title}</span>
      <span className="dur">~{node.duration.estMins}m</span>
      {active && (
        <button className="btn" onClick={onDone} aria-label={`Mark "${node.title}" done`}>
          ✓ Done
        </button>
      )}
    </div>
  );
}

export function App() {
  const allNodes = useMemo<TaskNode[]>(() => thaliV1.recipes.flatMap((r) => r.nodes), []);
  const validations = useMemo(() => thaliV1.recipes.map((r) => validate(r)), []);
  const allValid = validations.every((v) => v.ok);
  const [done, setDone] = useState<Set<string>>(new Set());

  // Placeholder derivation until the scheduler lands: a node is "active" when all its
  // dependencies are done; "done" when completed; otherwise it waits in the queue.
  const isDone = (id: string) => done.has(id);
  const active = allNodes.filter((n) => !isDone(n.nodeId) && n.dependencies.every(isDone));
  const queue = allNodes.filter((n) => !isDone(n.nodeId) && !n.dependencies.every(isDone));
  const archive = allNodes.filter((n) => isDone(n.nodeId));

  const complete = (id: string) => setDone((prev) => new Set(prev).add(id));

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
          <div className="time">7:30</div>
        </div>
        <div className="status">
          <span className="dot" /> {allValid ? "On track" : "Check recipes"}
        </div>
      </div>

      <p className="value">
        <b>3 dishes</b> · <span className="strike">91 min separately</span> →{" "}
        <b>~45 min with Tutti</b>
      </p>

      <Zone label="NOW">
        {active.length ? (
          active.map((n) => <NodeCard key={n.nodeId} node={n} active onDone={() => complete(n.nodeId)} />)
        ) : (
          <div className="idle">All done — dinner is served.</div>
        )}
      </Zone>

      <Zone label="NEXT" count={queue.length}>
        {queue.map((n) => (
          <NodeCard key={n.nodeId} node={n} active={false} onDone={() => {}} />
        ))}
      </Zone>

      <Zone label="DONE" count={archive.length}>
        {archive.map((n) => (
          <div key={n.nodeId} className="done-card">
            <s>{n.title}</s>
          </div>
        ))}
      </Zone>

      <footer className="scaffold-note">
        Scaffold build · engine validation {allValid ? "passing" : "failing"} · the scheduler &amp; full
        Cook Mode arrive with Brief v1–v2.
      </footer>
    </div>
  );
}
