import { useEffect, useState } from "react";
import { PasteParser, fetchRecipeFromUrl, type ParseResult } from "@tutti/ingest";
import type { RecipeGraph } from "@tutti/engine";
import { askAiForRecipe, fetchAiUsage, type AiUsage } from "./aiClient";

// Add-dish screen (Brief v3 item 5, Doc 5 §7): four ways to bring a recipe in. Paste and Find
// online are key-free (deterministic JSON-LD / heuristic parse). Ask AI is app-provided: the
// browser asks our server (which holds the keys), gets recipe text back, and parses it with the
// same pipeline. Parsed recipes are "unverified" until approved; the engine validate() gate guards every one.

type Tab = "paste" | "online" | "ai";

export function AddRecipe({ onAdd, onBack }: { onAdd: (g: RecipeGraph) => void; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiUsage, setAiUsage] = useState<AiUsage | null | undefined>(undefined); // undefined = not checked
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);

  useEffect(() => {
    if (tab === "ai" && aiUsage === undefined) void fetchAiUsage().then(setAiUsage);
  }, [tab, aiUsage]);

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
  // Ask the app's AI for a recipe, then parse the returned text with the same paste pipeline.
  const askAi = () => run(async () => {
    const ai = await askAiForRecipe(aiPrompt);
    if (ai.remaining !== undefined) setAiUsage((u) => (u ? { ...u, remaining: ai.remaining!, used: u.free - ai.remaining! } : u));
    return new PasteParser().parse({ source: "paste", text: ai.text });
  });

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
        <>
          <p className="value">Describe what you want — Tutti's AI writes the full recipe, then it joins your plan.</p>
          <textarea className="paste-area" rows={3} value={aiPrompt} placeholder={"e.g. a quick paneer butter masala for 4, not too spicy"} onChange={(e) => setAiPrompt(e.target.value)} aria-label="Describe the recipe" />
          <button className="btn big-btn" disabled={busy || !aiPrompt.trim() || aiUsage === null} onClick={askAi}>
            {busy ? "Writing…" : "✨ Generate recipe"}
          </button>
          {aiUsage === null && (
            <p className="hint">AI isn't set up on this server yet. Add a provider key to <code>apps/web/.env</code> (see <code>.env.example</code>) and restart.</p>
          )}
          {aiUsage && (
            <p className="hint">{aiUsage.remaining} of {aiUsage.free} free AI recipes left. Powered by {aiUsage.providers.join(" · ") || "your configured provider"}.</p>
          )}
        </>
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
