import { useState } from "react";
import { PasteParser, fetchRecipeFromUrl, type ParseResult } from "@tutti/ingest";
import type { RecipeGraph } from "@tutti/engine";

// Add-dish screen (Brief v3 item 5, Doc 5 §7): three ways to bring a recipe in. Paste and Find
// online are key-free (deterministic JSON-LD / heuristic parse); Ask AI needs a server + API key
// (the browser can't safely call the LLM), so it's flagged here. Parsed recipes are "unverified"
// until a human approves them, and the engine validate() gate guards every one.

type Tab = "paste" | "online" | "ai";

export function AddRecipe({ onAdd, onBack }: { onAdd: (g: RecipeGraph) => void; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);

  const run = async (fn: () => Promise<ParseResult>) => {
    setBusy(true); setError(null); setResult(null);
    try {
      setResult(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const parsePaste = () => run(() => new PasteParser().parse({ source: "paste", text }));
  const parseUrl = () => run(() => fetchRecipeFromUrl(url));

  const graph = result?.graph ?? null;
  const ok = result?.validation.ok ?? false;

  return (
    <section className="zone" aria-label="Add a dish">
      <h2 className="zone-h"><span>Add a dish</span></h2>

      <div className="subtabs">
        <button className={`subtab${tab === "paste" ? " on" : ""}`} onClick={() => setTab("paste")}>Paste</button>
        <button className={`subtab${tab === "online" ? " on" : ""}`} onClick={() => setTab("online")}>Find online</button>
        <button className={`subtab${tab === "ai" ? " on" : ""}`} onClick={() => setTab("ai")}>Ask AI</button>
      </div>

      {tab === "paste" && (
        <>
          <p className="value">Paste a recipe — title, ingredients, then the steps.</p>
          <textarea className="paste-area" rows={9} value={text} placeholder={"Tomato Rice\n\nIngredients:\n2 cups rice\n3 tomatoes\n\nMethod:\nChop the tomatoes\nSaute, add rice, simmer 15 min\nServe"} onChange={(e) => setText(e.target.value)} aria-label="Recipe text" />
          <button className="btn big-btn" disabled={busy || !text.trim()} onClick={parsePaste}>{busy ? "Parsing…" : "Parse recipe"}</button>
        </>
      )}

      {tab === "online" && (
        <>
          <p className="value">Paste a recipe URL. We read its structured data (works best on sites with schema.org markup).</p>
          <input className="time-input url-input" type="url" value={url} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} aria-label="Recipe URL" />
          <button className="btn big-btn" disabled={busy || !url.trim()} onClick={parseUrl}>{busy ? "Fetching…" : "Fetch recipe"}</button>
          <p className="hint">Some sites block cross-origin requests from the browser. If it fails, copy the recipe text and use the Paste tab.</p>
        </>
      )}

      {tab === "ai" && (
        <div className="idle">
          <b>Ask AI</b> turns a rough idea into a full recipe. It needs a server with an API key, so
          it's not available in this local build. Add <code>ANTHROPIC_API_KEY</code> and a backend to
          enable it — the parser is ready (<code>@tutti/ingest/ai</code>).
        </div>
      )}

      {error && <p className="alert">Couldn't parse that: {error}</p>}

      {result && (
        <div className="parse-result">
          <div className="now-head">
            <span className="tag"><span className="swatch" style={{ background: "var(--accent)" }} />{graph?.name ?? "Recipe"}</span>
            <span className="badge-unverified">unverified</span>
          </div>
          {ok ? (
            <p className="value">Parsed <b>{graph?.nodes.length}</b> steps. Looks valid — add it to your dishes.</p>
          ) : (
            <div className="alert">
              Needs a fix before cooking:
              <ul>{result.validation.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
          {result.validation.warnings.length > 0 && (
            <p className="hint">{result.validation.warnings.length} warning(s): {result.validation.warnings.join("; ")}</p>
          )}
          {ok && graph && (
            <button className="btn big-btn" onClick={() => onAdd(graph)}>Add to my dishes</button>
          )}
        </div>
      )}

      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
