import { useEffect, useState } from "react";
import { parseMenu, PasteParser } from "@tutti/ingest";
import { compileRecipe, type RecipeGraph } from "@tutti/engine";
import { library } from "./library";
import { askAiForRecipe, fetchAiUsage, type AiUsage } from "./aiClient";
import { colorFor } from "./dishColors";

// Import a restaurant menu (text) → for each dish, find it in the library (the "popular" version) or
// AI-generate it, then save to the personal library. Networked + opt-in (generation calls the app's
// AI). Phase 1 = pasted text; PDF/photo (OCR) come next.

type Status = "searching" | "matched" | "miss" | "adding" | "added" | "error";
interface Row {
  name: string;
  status: Status;
  matchId?: string;
  matchName?: string;
  detail?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
function isLikelyMatch(menu: string, hit: string): boolean {
  const a = norm(menu);
  const b = norm(hit);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const ta = new Set(a.split(" "));
  const tb = new Set(b.split(" "));
  const inter = [...ta].filter((w) => tb.has(w)).length;
  return inter / new Set([...ta, ...tb]).size >= 0.6; // Jaccard overlap
}

export function MenuImportScreen({ onAdd, onBack }: { onAdd: (g: RecipeGraph) => void; onBack: () => void }) {
  const [text, setText] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage | null | undefined>(undefined);

  useEffect(() => { void fetchAiUsage().then(setAiUsage); }, []);

  const find = async () => {
    const names = parseMenu(text);
    const init: Row[] = names.map((name) => ({ name, status: "searching" }));
    setRows(init);
    // resolve each against the library
    await Promise.all(
      names.map(async (name, i) => {
        try {
          const res = await library.searchDishes({ q: name, pageSize: 3 });
          const hit = res.dishes[0];
          setRows((prev) => {
            if (!prev) return prev;
            const next = [...prev];
            next[i] = hit && isLikelyMatch(name, hit.name)
              ? { name, status: "matched", matchId: hit.defaultRecipeId, matchName: hit.name }
              : { name, status: "miss" };
            return next;
          });
        } catch {
          setRows((prev) => prev && prev.map((r, k) => (k === i ? { ...r, status: "miss" } : r)));
        }
      }),
    );
  };

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev && prev.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const addMatch = async (i: number, row: Row) => {
    setRow(i, { status: "adding" });
    try {
      const g = row.matchId ? await library.getRecipe(row.matchId) : null;
      if (!g) throw new Error("recipe unavailable");
      onAdd({ ...g, tags: [...(g.tags ?? []), "menu"] });
      setRow(i, { status: "added", detail: row.matchName });
    } catch (e) {
      setRow(i, { status: "error", detail: e instanceof Error ? e.message : "failed" });
    }
  };

  const generate = async (i: number, row: Row) => {
    setRow(i, { status: "adding" });
    try {
      const ai = await askAiForRecipe(`Write a recipe for "${row.name}"${restaurant ? `, ${restaurant}-style` : ""}.`);
      if (ai.remaining !== undefined) setAiUsage((u) => (u ? { ...u, remaining: ai.remaining!, used: u.free - ai.remaining! } : u));
      const { graph } = await new PasteParser().parse({ source: "paste", text: ai.text });
      if (!graph) throw new Error("couldn't parse the generated recipe");
      onAdd({ ...compileRecipe(graph, { name: row.name }), tags: ["menu", "ai"] });
      setRow(i, { status: "added", detail: "AI-generated" });
    } catch (e) {
      setRow(i, { status: "error", detail: e instanceof Error ? e.message : "failed" });
    }
  };

  const aiReady = aiUsage !== null;
  const pending = rows?.filter((r) => r.status === "matched" || r.status === "miss") ?? [];
  const addAllMatches = () => rows?.forEach((r, i) => { if (r.status === "matched") void addMatch(i, r); });
  const genAllMisses = () => rows?.forEach((r, i) => { if (r.status === "miss" && aiReady) void generate(i, r); });

  return (
    <section className="zone" aria-label="Import a menu">
      <h2 className="zone-h"><span>Import a menu</span></h2>

      {!rows ? (
        <>
          <p className="value">Paste a restaurant menu. Tutti finds each dish in the library — or writes it with AI — and saves them to your recipes.</p>
          <label className="editor-field"><span className="editor-label">Restaurant</span>
            <input className="editor-input" value={restaurant} placeholder="optional — for the style" onChange={(e) => setRestaurant(e.target.value)} aria-label="Restaurant name" />
          </label>
          <textarea className="paste-area" rows={10} value={text} placeholder={"Paste the menu…\n\nStarters\nPaneer Tikka  280\nChicken 65  320\n\nMains\nHyderabadi Biryani  350"} onChange={(e) => setText(e.target.value)} aria-label="Menu text" />
          <button className="btn big-btn" disabled={!text.trim()} onClick={() => void find()}>Find dishes</button>
          <p className="hint">Generation uses the app's AI (networked). PDF &amp; photo import are coming next.</p>
        </>
      ) : (
        <>
          <p className="value">{rows.length} dishes found. Add the library matches, generate the rest.</p>
          <div className="shop-actions">
            <button className="btn ghost" onClick={addAllMatches} disabled={!rows.some((r) => r.status === "matched")}>Add all matches</button>
            <button className="btn ghost" onClick={genAllMisses} disabled={!aiReady || !rows.some((r) => r.status === "miss")}>✨ Generate all missing</button>
          </div>
          {!aiReady && <p className="hint">AI generation isn't set up on this server — add a provider key to <code>apps/web/.env</code> to enable it. Library matches still work.</p>}
          {aiUsage && <p className="hint">{aiUsage.remaining} of {aiUsage.free} free AI recipes left.</p>}

          <div className="ing-sec">
            {rows.map((r, i) => (
              <div className="browse-line" key={`${r.name}|${i}`}>
                <span className="pick-row" style={{ flex: 1 }}>
                  <span className="pick-main" style={{ pointerEvents: "none" }}>
                    <span className="swatch" style={{ background: colorFor(r.matchId ?? r.name) }} />
                    <span className="node-title">{r.name}</span>
                    {r.status === "searching" && <span className="dur">searching…</span>}
                    {r.status === "matched" && <span className="ways">found: {r.matchName}</span>}
                    {r.status === "miss" && <span className="dur">no match</span>}
                    {r.status === "adding" && <span className="dur">adding…</span>}
                    {r.status === "added" && <span className="browse-add">✓ added{r.detail ? ` · ${r.detail}` : ""}</span>}
                    {r.status === "error" && <span className="badge-allergen">⚠ {r.detail}</span>}
                  </span>
                </span>
                {r.status === "matched" && <button className="browse-info" aria-label={`Add ${r.name}`} onClick={() => void addMatch(i, r)}>＋</button>}
                {r.status === "miss" && <button className="browse-info" aria-label={`Generate ${r.name}`} disabled={!aiReady} onClick={() => void generate(i, r)}>✨</button>}
              </div>
            ))}
          </div>
          <div className="home-links">
            <button className="link" onClick={() => setRows(null)}>← New menu</button>
            <button className="link" onClick={onBack}>Done</button>
          </div>
        </>
      )}

      {!rows && <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>}
    </section>
  );
}
