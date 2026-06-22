# 11 — Add Recipe Flow

## Overview

The Add Recipe flow is the primary ingestion path for users who want to bring external recipes into their personal Tutti library. It accepts three input types — raw pasted text, a URL, and a natural-language AI prompt — and converts them into a validated RecipeGraph that is saved quietly to the personal library (candidates + IndexedDB) without disrupting the user's current context. The flow lives on the `addRecipe` screen and is reachable from Studio (the "+" action) and from the Browse screen when a user wants to adapt a server catalog recipe.

---

## Current State

**File:** `apps/web/src/screens/AddRecipeScreen.tsx`

Three tabs are already implemented:

- **Paste** — accepts raw text pasted from any source, runs it through `PasteParser`, then `compileRecipe` to produce a `RecipeGraph`.
- **URL** — accepts a URL string and calls a server fetch-and-parse route.
- **Ask AI** — accepts a natural-language prompt and routes it through `aiRouter` to generate a recipe graph.

After any parse path, a preview card is shown. On confirmation the recipe is saved via `onAdd`, which writes to `candidates` (localStorage key `tutti.candidates`) and IndexedDB `recipeStore`.

**What works:** The three-tab structure, PasteParser integration, compileRecipe call, and basic save flow.

**What is broken or missing:**

- Tab labels are inconsistent with V2 conventions (implementation detail varies from specified copy).
- The URL tab has no loading skeleton — the UI is blank during the fetch request.
- There is no error state with retry on URL fetch failure.
- The Ask AI tab does not surface an API key configuration warning when the key is absent.
- The parse result card does not offer an inline edit path — confirmation jumps straight to save.
- Broken-parse cases (0 steps or missing name) have no dedicated error message; the UI silently shows a broken or empty card.
- After save, navigation currently pushes toward plan/home rather than returning focus to Studio with a toast.
- No `compileRecipe` normalization guard is called after PasteParser in all code paths — consistency is not enforced.

---

## Problem

From a real user's perspective:

1. **Paste from WhatsApp or a cookbook photo transcription is the most common real-world input**, but the placeholder text does not signal this — users assume the parser only handles clean web formats.
2. **URL fetch gives no feedback** — users stare at a blank tab and do not know if the app is working or has silently failed. There is no retry path, so a transient network error requires reloading the whole screen.
3. **Ask AI fails invisibly when no API key is configured** — the user submits a prompt, gets nothing, and has no idea whether it is a configuration issue or a bug.
4. **The parse preview is take-it-or-leave-it** — if the name is slightly wrong or servings are off, the user must accept the bad data and go fix it in the editor afterward, which is a multi-step detour.
5. **A garbled paste (e.g., OCR noise, list-only format with no steps) shows a broken card** with no actionable guidance — users do not know whether to try a different format or use Ask AI instead.
6. **After saving, the app navigates away from the user's current context** — if the user was building a plan on Home and opened Add Recipe to import a missing dish, they lose their place.

---

## V2 Design

**Tab labels are standardised** to `Paste | From URL | Ask AI` — the copy matches the user's mental model (action verbs for the first two, capability label for the third).

**Paste tab gets an honest placeholder** that explicitly names real-world sources (website, cookbook, WhatsApp). This directly addresses the discoverability problem — users who photographed a recipe card and typed it up will recognise the use case immediately.

**URL tab gets a full request lifecycle**: loading skeleton while the server fetch is in-flight, an error state with a human-readable reason and a Retry button if the fetch fails. The skeleton matches the parse result card height so the layout does not jump.

**Ask AI tab surfaces the configuration warning upfront** — before the user submits, if the server reports no `OPENAI_API_KEY` configured, a banner is shown inline: "AI features need an API key — add OPENAI_API_KEY to your server .env". This turns a silent failure into an actionable ops message.

**The parse result card gains a three-way decision**: "Looks right" (save immediately), "Edit before saving" (opens a trimmed inline editor scoped to name, servings, and step list — not the full Studio editor), and "Try again" (clears the result and returns focus to the active tab's input). This eliminates the forced detour to the full editor for minor corrections.

**Broken parse gets a dedicated error state** — if `compileRecipe` produces a graph with 0 steps or an empty name, the parse result card is replaced by a contextual prompt: "Couldn't parse this — try pasting a different format or use Ask AI." The tab switcher remains visible so the user can immediately pivot.

**Save is quiet and context-preserving** — `saveToLibrary` writes to candidates + IndexedDB without navigating away from the caller's screen. A toast "Recipe saved to Studio" confirms success. The screen that opened Add Recipe (tracked by `prevScreen` in App.tsx) is restored on dismiss.

**`compileRecipe` is called as a mandatory normalisation step after every parse path** (Paste, URL, Ask AI) before the result card is rendered. This guarantees the graph is in a consistent state regardless of which ingestor produced it.

---

## Spec

### Component: `AddRecipeScreen`

**File:** `apps/web/src/screens/AddRecipeScreen.tsx`

**Props:**
```ts
interface AddRecipeScreenProps {
  onAdd: (recipe: RecipeGraph) => void;
  onDismiss: () => void; // navigates back to prevScreen
}
```

**Local state:**
```ts
type Tab = 'paste' | 'url' | 'ai';
type FetchState = 'idle' | 'loading' | 'error';

const [activeTab, setActiveTab] = useState<Tab>('paste');
const [pasteText, setPasteText] = useState('');
const [urlInput, setUrlInput] = useState('');
const [aiPrompt, setAiPrompt] = useState('');
const [fetchState, setFetchState] = useState<FetchState>('idle');
const [fetchError, setFetchError] = useState<string | null>(null);
const [parsed, setParsed] = useState<RecipeGraph | null>(null);
const [parseError, setParseError] = useState<string | null>(null); // broken parse message
const [aiKeyMissing, setAiKeyMissing] = useState(false);
const [showInlineEditor, setShowInlineEditor] = useState(false);
```

### Tab bar

```tsx
<div className="add-recipe-tabs" role="tablist">
  {(['paste', 'url', 'ai'] as Tab[]).map(t => (
    <button
      key={t}
      role="tab"
      aria-selected={activeTab === t}
      className={activeTab === t ? 'tab-active' : ''}
      onClick={() => { setActiveTab(t); resetResult(); }}
    >
      {TAB_LABELS[t]}
    </button>
  ))}
</div>
```

```ts
const TAB_LABELS: Record<Tab, string> = {
  paste: 'Paste',
  url: 'From URL',
  ai: 'Ask AI',
};
```

### Paste tab panel

```tsx
<textarea
  className="add-recipe-paste-input"
  placeholder="Paste any recipe — from a website, cookbook, or WhatsApp"
  value={pasteText}
  onChange={e => setPasteText(e.target.value)}
  rows={10}
/>
<button
  className="btn-primary"
  disabled={pasteText.trim().length === 0}
  onClick={handlePasteParse}
>
  Parse Recipe
</button>
```

**`handlePasteParse`:**
1. Call `PasteParser.parse(pasteText)` → raw graph.
2. Call `compileRecipe(rawGraph)` → normalised `RecipeGraph`.
3. Validate: if `graph.nodes.length === 0 || !graph.name` → `setParseError('Couldn't parse this — try pasting a different format or use Ask AI')`.
4. Otherwise → `setParsed(graph)`.

### URL tab panel

```tsx
<div className="add-recipe-url-row">
  <input
    type="url"
    className="add-recipe-url-input"
    placeholder="https://..."
    value={urlInput}
    onChange={e => setUrlInput(e.target.value)}
  />
  <button
    className="btn-primary"
    disabled={!isValidUrl(urlInput) || fetchState === 'loading'}
    onClick={handleUrlFetch}
  >
    {fetchState === 'loading' ? 'Fetching…' : 'Fetch'}
  </button>
</div>

{fetchState === 'loading' && <RecipeCardSkeleton />}

{fetchState === 'error' && (
  <div className="add-recipe-error" role="alert">
    <span>{fetchError ?? 'Could not fetch that URL.'}</span>
    <button className="btn-ghost" onClick={handleUrlFetch}>Retry</button>
  </div>
)}
```

**`handleUrlFetch`:**
1. `setFetchState('loading')`.
2. `GET /api/recipe?url=encodeURIComponent(urlInput)`.
3. On success: receive `RecipeGraph` JSON → `compileRecipe(raw)` → validate → `setParsed` or `setParseError`.
4. On network/HTTP error: `setFetchState('error')`, `setFetchError(err.message)`.
5. Always: `setFetchState('idle')` after handling (error state displayed separately from fetchState 'loading').

**`RecipeCardSkeleton`** — a `div.recipe-card-skeleton` with animated shimmer matching the parse result card dimensions (name placeholder ~120 px wide, servings chip, 4 step rows).

### Ask AI tab panel

```tsx
{aiKeyMissing && (
  <div className="add-recipe-ai-warning" role="alert">
    AI features need an API key — add OPENAI_API_KEY to your server .env
  </div>
)}
<textarea
  className="add-recipe-ai-input"
  placeholder="What would you like to cook?"
  value={aiPrompt}
  onChange={e => setAiPrompt(e.target.value)}
  rows={5}
  disabled={aiKeyMissing}
/>
<button
  className="btn-primary"
  disabled={aiPrompt.trim().length === 0 || aiKeyMissing || fetchState === 'loading'}
  onClick={handleAiSubmit}
>
  {fetchState === 'loading' ? 'Generating…' : 'Generate Recipe'}
</button>
{fetchState === 'loading' && <RecipeCardSkeleton />}
```

**`aiKeyMissing` detection:** on tab mount (or on first render of the AI panel), call `GET /api/recipe/ai-status` → `{ configured: boolean }`. Set `setAiKeyMissing(!configured)`. Cache the result in component state for the session.

**`handleAiSubmit`:**
1. `setFetchState('loading')`.
2. `POST /api/recipe` with body `{ prompt: aiPrompt }`.
3. On success: `compileRecipe(raw)` → validate → `setParsed` or `setParseError`.
4. On error (including 503 key-not-configured): `setFetchState('error')`, `setFetchError(...)`.

### Parse result card

Shown when `parsed !== null && !showInlineEditor`.

```tsx
<div className="parse-result-card">
  <div className="parse-result-name">{parsed.name}</div>
  <div className="parse-result-meta">
    <span>{parsed.servings} servings</span>
    <span>·</span>
    <span>{parsed.nodes.length} steps</span>
    <span>·</span>
    <span>~{estimatedMinutes(parsed)} min</span>
  </div>
  <div className="parse-result-actions">
    <button className="btn-primary" onClick={handleConfirm}>Looks right</button>
    <button className="btn-secondary" onClick={() => setShowInlineEditor(true)}>Edit before saving</button>
    <button className="btn-ghost" onClick={resetResult}>Try again</button>
  </div>
</div>
```

`estimatedMinutes(graph: RecipeGraph): number` — sum of all node durations from `graph.nodes`, converted to minutes, rounded up.

### Broken parse error state

Shown when `parseError !== null`.

```tsx
<div className="parse-error-state" role="alert">
  <p>{parseError}</p>
  <button className="btn-ghost" onClick={resetResult}>Try again</button>
</div>
```

`resetResult()` clears `parsed`, `parseError`, `fetchError`, `fetchState`.

### Inline editor

Shown when `showInlineEditor && parsed !== null`. A lightweight form — not `EditRecipeScreen`.

```tsx
<div className="add-recipe-inline-editor">
  <label>Name
    <input value={draft.name} onChange={...} />
  </label>
  <label>Servings
    <input type="number" min={1} value={draft.servings} onChange={...} />
  </label>
  <ol className="inline-editor-steps">
    {draft.nodes.map((node, i) => (
      <li key={node.id}>
        <input value={node.label} onChange={...} />
      </li>
    ))}
  </ol>
  <div className="inline-editor-actions">
    <button className="btn-primary" onClick={handleConfirmEdited}>Save</button>
    <button className="btn-ghost" onClick={() => setShowInlineEditor(false)}>Back</button>
  </div>
</div>
```

Draft state: `const [draft, setDraft] = useState<RecipeGraph | null>(null)` — initialised from `parsed` when `showInlineEditor` becomes true.

### Save flow: `handleConfirm` and `handleConfirmEdited`

```ts
async function handleConfirm() {
  const graph = showInlineEditor ? draft! : parsed!;
  await saveToLibrary(graph);          // candidates localStorage + IndexedDB recipeStore
  onAdd(graph);                        // parent updates local state if needed
  showToast('Recipe saved to Studio'); // global toast queue
  onDismiss();                         // restores prevScreen
}
```

`saveToLibrary` must not trigger navigation. It is a pure write — existing callers that navigate after `onAdd` must be updated to call `onDismiss` instead.

### CSS classes (new)

| Class | Purpose |
|---|---|
| `.add-recipe-tabs` | Tab bar container, horizontal flex |
| `.add-recipe-paste-input` | Full-width textarea, Paste tab |
| `.add-recipe-url-row` | Input + button in a row, URL tab |
| `.add-recipe-url-input` | Flex-grow URL text input |
| `.add-recipe-error` | Error banner with inline Retry button |
| `.add-recipe-ai-warning` | Yellow/amber banner for missing API key |
| `.add-recipe-ai-input` | Multiline textarea, Ask AI tab |
| `.recipe-card-skeleton` | Shimmer skeleton matching parse result card height |
| `.parse-result-card` | Result preview card |
| `.parse-result-name` | Recipe name, large weight |
| `.parse-result-meta` | Servings · steps · time chips |
| `.parse-result-actions` | Three-button action row |
| `.parse-error-state` | Broken parse message + Try again |
| `.add-recipe-inline-editor` | Lightweight name/servings/steps form |
| `.inline-editor-steps` | Ordered list of step inputs |
| `.inline-editor-actions` | Save / Back row |

---

## Data & Dependencies

### Engine calls

| Call | When |
|---|---|
| `PasteParser.parse(text): RawGraph` | Paste tab on submit |
| `compileRecipe(raw): RecipeGraph` | After every parse path, mandatory |
| `estimatedMinutes(graph)` | Parse result card display — computed locally from node durations |

### Server API calls

| Endpoint | Method | Tab | Purpose |
|---|---|---|---|
| `/api/recipe?url=` | GET | URL | Fetch + parse a web recipe |
| `/api/recipe` | POST `{prompt}` | Ask AI | Generate recipe from natural language |
| `/api/recipe/ai-status` | GET | Ask AI (on mount) | Check if OPENAI_API_KEY is configured |

### Storage writes

| Store | Key / Store name | Data written |
|---|---|---|
| localStorage | `tutti.candidates` | Appends new `RecipeGraph` to candidates array |
| IndexedDB | `recipeStore` | Upserts `RecipeGraph` by `recipeId` |

### Screens that open Add Recipe

| Screen | Entry point | Return path |
|---|---|---|
| Studio | "+" FAB or header button | Back to Studio (`prevScreen = 'studio'`) |
| Browse | "Add to library" action on a server recipe | Back to Browse (`prevScreen = 'browse'`) |

`prevScreen` is already tracked in `App.tsx` — `onDismiss` must read it and set the active screen accordingly. No new navigation mechanism is needed.

### Screens affected by changes

- **Studio screen** — receives updated candidates list after save; should refresh its recipe list from `saveToLibrary` side-effect (already reacts to IndexedDB writes via existing subscription pattern).
- **App.tsx** — `onAdd` callback must not navigate; save + toast + `onDismiss` is the complete contract.
- **Toast system** — `showToast` must accept a string and display a non-blocking banner for ~3 seconds; confirm this is already wired globally before shipping.

### Edge cases

| Scenario | Handling |
|---|---|
| Paste is empty on submit | Parse button disabled — cannot submit |
| URL is not a valid URL format | Fetch button disabled (`isValidUrl` guard) |
| Server returns a graph with a name but 0 steps | Broken parse error state — "Couldn't parse this…" |
| Server returns a graph with steps but no name | Same broken parse error path |
| URL fetch times out after 15 s | Treat as error — show timeout message + Retry |
| User switches tabs mid-fetch | Cancel in-flight request (`AbortController`), reset `fetchState` |
| AI key missing but user submits anyway | Button is disabled when `aiKeyMissing` is true — submit is blocked |
| `saveToLibrary` throws (IndexedDB quota exceeded) | Catch + show error toast "Couldn't save — storage may be full" — do not call `onDismiss` |
| `compileRecipe` throws on malformed input | Wrap in try/catch → broken parse error path |
| Duplicate recipe (same name already in library) | Save proceeds — duplicates allowed; Studio deduplicates on display by `recipeId` |
