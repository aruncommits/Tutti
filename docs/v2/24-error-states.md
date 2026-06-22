# 24 — Error States

## Overview

Error states are the gap between what the user intended and what the app could deliver. Tutti's error design follows one rule: every error message tells the user what happened, why it happened (in plain language), and what they can do next. Errors are scoped to the smallest possible surface — an inline hint when only a field is wrong, a panel when a screen can't load, never a full-screen wall for something recoverable. The app distinguishes between hard failures (can't proceed) and soft failures (can continue with degraded capability), and handles each class differently.

## Current State

There is no centralised error handling strategy in V2. Errors are handled ad hoc across screens:

- `Browse.tsx` wraps the catalog fetch in a try/catch and renders a generic "Failed to load" string with no retry affordance.
- `useRecipeLoader.ts` (or equivalent fetch hook) surfaces fetch failures via a boolean `error` flag; calling components decide what to render, inconsistently.
- `menuImport` screen shows nothing when `parseMenu()` returns an empty array — the user sees a blank results list with no explanation.
- `compile()` errors bubble up to `Home.tsx` as uncaught exceptions, occasionally crashing the app to a white screen rather than showing a recoverable state.
- IndexedDB failure is completely unhandled — if the browser rejects `recipeStore` (private browsing, storage quota), the app silently drops saves.
- WakeLock and SpeechSynthesis failures are caught individually in cook-mode hooks; neither is surfaced or hidden consistently.
- Validation errors in `editRecipe` use a mix of browser `required` attribute enforcement and custom inline messages that are not visually consistent with each other.
- No global error boundary exists in `App.tsx`; an unhandled render exception in any screen crashes the whole app.
- File paths: `src/Browse.tsx`, `src/Home.tsx`, `src/EditRecipe.tsx`, `src/MenuImport.tsx`, `packages/engine/src/compile.ts`, `src/hooks/useWakeLock.ts`, `src/hooks/useSpeechSynthesis.ts`.

## Problem

From a real user's perspective:

1. Browse goes blank when offline. The user sees nothing — no message, no way back, no fallback to their saved recipes. They assume the app is broken.
2. Pasting a recipe that the parser can't handle shows no feedback. The "Add" button stays available; pressing it saves a broken empty graph silently.
3. Menu import with bad input produces a blank list. The user doesn't know whether to wait longer, paste differently, or abandon the flow.
4. A `compile()` crash produces a white screen with no escape route. The user has to force-quit and loses their dish selection.
5. Private browsing users discover their library has vanished after they close the tab — they find out by losing data, not by being warned.
6. The AI quota 429 surface is completely absent. The user just sees a spinner that never resolves.
7. Missing API key (401) shows the same absent state — the user has no idea a key is required.
8. Validation errors across forms are visually inconsistent — some use red borders, some use alert dialogs, some use nothing.

## V2 Design

**Scope errors to the smallest blast radius.** A network error fetching the catalog does not remove the tab bar. A validation error on recipe name does not block the rest of the form. A compile failure does not unmount the Home screen.

**Every error message has three parts:** what happened (past tense, specific), why (one clause, no jargon), and what to do next (one or two actions). Example: "Couldn't load the recipe catalog. Check your connection, then try again." [Retry] [Show saved recipes].

**Distinguish hard vs soft failures.** Hard failure = the user cannot complete the current task without resolving the error. Soft failure = the user can continue but with reduced capability. Hard failures get inline panel treatment (replaces content, within the same screen). Soft failures get a dismissible banner at the top of the relevant screen.

**AI errors are surfaced immediately on resolution**, not on initiation. The spinner runs while the request is in flight; when a 429 or 401 comes back, the spinner is replaced by the error state in the same slot. No full-screen takeover.

**WakeLock and SpeechSynthesis are feature-detected before any UI is rendered.** If the capability is absent, the button or toggle never appears. No error message, no visible fallback — the feature simply does not exist on that device. This is the correct contract for progressive enhancement.

**A single global `<ErrorBoundary>` wraps `App.tsx`** as a last resort for unhandled render exceptions. Its UI is the only true full-screen error state: a centred panel with the app name, "Something went wrong", a Reload button, and a "Report this" mailto link. This should never be seen in normal use.

**Private browsing is detected once, on startup, with a persistent soft banner.** The banner is dismissible, lives at the top of every screen, and persists across navigation within the session (it does not re-appear after dismiss within a session). It does not block any action.

## Spec

### Component inventory

| Component | Type | Location |
|---|---|---|
| `<ErrorBoundary>` | Class component | `src/components/ErrorBoundary.tsx` |
| `<ScreenErrorPanel>` | FC | `src/components/ScreenErrorPanel.tsx` |
| `<InlineBanner>` | FC | `src/components/InlineBanner.tsx` |
| `<FieldError>` | FC | `src/components/FieldError.tsx` |
| `useStorageMode` | Hook | `src/hooks/useStorageMode.ts` |

---

### `<ErrorBoundary>` — global last resort

Wraps the entire `<App />` tree. Catches any render exception that escapes all other handling.

```
state: { hasError: boolean; error: Error | null }
static getDerivedStateFromError(error) → { hasError: true, error }
componentDidCatch → console.error (no external reporting in V1)
```

Render when `hasError`:
- Full-screen centred column, `data-theme` inherited.
- App wordmark (text, not image — image may have failed).
- Heading: "Something went wrong"
- Body: "An unexpected error occurred. Reload the app to continue. If this keeps happening, report it."
- Button: "Reload app" → `window.location.reload()`
- Link: "Report this" → `mailto:support@tutti.app?subject=Crash%20report&body=<encodeURIComponent(error.message + '\n' + error.stack)>`

CSS class: `.error-boundary-full`

---

### `<ScreenErrorPanel>` — replaces screen content on hard failure

Props:
```typescript
interface ScreenErrorPanelProps {
  icon?: string            // emoji or icon name; default "⚠️" — only used if user explicitly wants emoji, otherwise omit
  heading: string          // "Couldn't load recipes"
  body: string             // "Check your connection and try again."
  primaryAction?: {
    label: string
    onPress: () => void
  }
  secondaryAction?: {
    label: string
    onPress: () => void
  }
}
```

Renders within the screen's normal scroll container, vertically centred, replacing the content that failed to load. The tab bar and screen header remain visible. This is not full-screen.

CSS class: `.screen-error-panel`

---

### `<InlineBanner>` — soft failure, dismissible

Props:
```typescript
interface InlineBannerProps {
  variant: 'warning' | 'info' | 'error'
  message: string
  onDismiss?: () => void   // if omitted, no dismiss button
  action?: {
    label: string
    onPress: () => void
  }
}
```

Renders at the top of screen content, below the screen header, above the main scroll area. Height: auto (wraps message). Does not scroll away with content — position is fixed within the screen container.

CSS classes: `.inline-banner`, `.inline-banner--warning`, `.inline-banner--info`, `.inline-banner--error`

---

### `<FieldError>` — inline validation, below a form field

Props:
```typescript
interface FieldErrorProps {
  message: string    // displayed when non-empty
  id: string         // linked via aria-describedby on the input
}
```

Red text, `role="alert"`, `aria-live="polite"`. Appears immediately when validation fires (on blur, or on submit attempt). The associated input gets `aria-invalid="true"` and a red border via the `.field--invalid` class on the wrapping `<div>`.

---

### Network errors — Browse catalog

**Trigger:** `GET /api/library/list` fails (network error, 5xx, timeout after 10 s).

**Component:** `<ScreenErrorPanel>` replaces the recipe grid in `Browse.tsx`.

```
heading: "Can't load recipes"
body: "Check your connection, then try again."
primaryAction: { label: "Retry", onPress: () => refetch() }
secondaryAction: { label: "Show my saved recipes", onPress: () => setFilter('local') }
```

The "Show my saved recipes" action switches the Browse view to show only the user's personal library (candidates + IndexedDB). It does not navigate away. The filter chip row updates to reflect this. If the personal library is also empty, a second `<ScreenErrorPanel>` renders: "No saved recipes yet — add one from Studio."

**State in `Browse.tsx`:**
```typescript
type BrowseLoadState = 'loading' | 'loaded' | 'error' | 'local-only'
```

---

### Network errors — single recipe fetch

**Trigger:** `GET /api/library/recipe/:id` fails with network error or returns 404, or times out after 10 s.

**Location:** `Recipe.tsx` screen, `useRecipeLoader` hook.

**Component:** `<ScreenErrorPanel>` replaces recipe content.

```
heading: "Couldn't load this recipe"
body: "It may have moved or your connection dropped."
primaryAction: { label: "Go back", onPress: () => goBack() }
```

`goBack()` calls the existing `prevScreen` navigation (already implemented in `App.tsx`). There is no retry here — the user should go back and try re-opening.

---

### AI errors — quota exceeded (429)

**Trigger:** `POST /api/recipe` (AI generation endpoint) returns HTTP 429.

**Location:** `MenuImport.tsx` and `AddRecipe.tsx` AI-generate flows.

The spinner that was showing in the AI result slot is replaced by an `<InlineBanner variant="error">`:

```
message: "AI limit reached — try again tomorrow, or add your own API key in Settings."
action: { label: "Open Settings", onPress: () => navigate('settings') }
```

The user can still manually type a recipe or use the paste-parser path. Those paths remain available and unblocked.

---

### AI errors — missing API key (401)

**Trigger:** `POST /api/recipe` returns HTTP 401.

**Location:** Same as 429 — `MenuImport.tsx` and `AddRecipe.tsx`.

`<InlineBanner variant="info">`:

```
message: "AI features need an API key to work."
action: { label: "See setup guide", onPress: () => window.open('https://tutti.app/docs/ai-setup', '_blank') }
```

This is `info` variant (not `error`) because it is a setup state, not a failure state. The user is not blocked; manual recipe entry remains available.

---

### Parse errors — PasteParser returns empty graph

**Trigger:** User pastes recipe text into `AddRecipe.tsx`; `parseRecipe(text)` returns a `RecipeGraph` with `nodes: []`.

**Location:** Inline within the paste input area in `AddRecipe.tsx`.

`<InlineBanner variant="warning">` directly below the textarea:

```
message: "Couldn't parse this recipe — try pasting a different format, or use Ask AI to generate it."
action: { label: "Try Ask AI", onPress: () => setMode('ai') }
```

The "Add recipe" submit button is disabled when the parsed graph has zero nodes. The user cannot save a broken empty graph.

**Guard in `AddRecipe.tsx`:**
```typescript
const canSubmit = parsedGraph !== null && parsedGraph.nodes.length > 0
```

---

### Parse errors — menu import finds no dish names

**Trigger:** `parseMenu(text)` returns `[]` in `MenuImport.tsx`.

`<InlineBanner variant="warning">` replaces the results list:

```
message: "No dish names found — try pasting just the dish names, one per line."
```

No action button. The input field stays editable so the user can paste again. The "Find matches" button re-runs `parseMenu` on the current text content.

---

### App error — `compile()` throws

**Trigger:** `compile(recipes, kitchen, serveTime)` throws in `Home.tsx` when the user presses "Build Plan".

**Location:** Inline within `Home.tsx`, replacing the Build Plan button area.

`<ScreenErrorPanel>` within the bottom action area (not replacing the full dish list):

```
heading: "Something went wrong building your plan"
body: "Your dish selection is saved — edit the recipes or report this."
primaryAction: { label: "Edit recipes", onPress: () => navigate('studio') }
secondaryAction: { label: "Report this", onPress: () => window.open(reportUrl) }
```

`reportUrl` is a mailto with `subject=compile-error` and `body` containing the stringified caught error and the recipe IDs that were in the plan.

The dish selection remains intact in state. The user does not lose their picks.

**Guard in `Home.tsx`:**
```typescript
try {
  const plan = compile(selectedRecipes, kitchen, serveTime)
  navigate('preview', { plan })
} catch (err) {
  setCompileError(err as Error)
}
```

---

### App error — IndexedDB unavailable

**Trigger:** `recipeStore.open()` throws or rejects on startup (private browsing, quota exceeded, browser restriction).

**Detection:** `useStorageMode` hook, called once in `App.tsx` during initialization.

```typescript
// useStorageMode.ts
export type StorageMode = 'normal' | 'ephemeral'

export function useStorageMode(): StorageMode {
  const [mode, setMode] = useState<StorageMode>('normal')
  useEffect(() => {
    testIndexedDB().then(ok => {
      if (!ok) setMode('ephemeral')
    })
  }, [])
  return mode
}

async function testIndexedDB(): Promise<boolean> {
  try {
    const req = indexedDB.open('__tutti_test__', 1)
    await new Promise<void>((res, rej) => {
      req.onsuccess = () => { req.result.close(); res() }
      req.onerror = () => rej(req.error)
    })
    return true
  } catch {
    return false
  }
}
```

**Banner:** `<InlineBanner variant="warning">` rendered in `App.tsx` above all screen content, below the top header. Persists across screen navigation. Dismissible once per session (state held in `useState`, not persisted).

```
message: "Private mode detected — recipes you add won't be saved after you close this tab."
onDismiss: () => setStorageBannerDismissed(true)
```

No action button. The app continues to function; in-memory state works normally. Writes to `recipeStore` are no-ops (swallowed by the store wrapper). `localStorage` writes to `tutti.candidates` still work because `localStorage` may be available in private browsing depending on browser; the banner is specific to IndexedDB.

---

### Soft failure — WakeLock denied

**Trigger:** `navigator.wakeLock.request('screen')` throws or rejects in `useWakeLock.ts`.

**Handling:** Catch the error, set `wakeLockActive = false`. No banner, no message, no user-visible feedback.

The cook screen continues without screen-wake. The toggle in the cook screen header reflects the actual state (`wakeLockActive`). If the toggle is shown and the user presses it, and the lock fails, the toggle returns to off silently.

This is the correct behaviour: the user can cook normally; their screen may dim. Telling them "screen wake not supported" is noise.

---

### Soft failure — SpeechSynthesis unavailable

**Trigger:** Feature detection at component mount in `useSpeechSynthesis.ts`.

```typescript
const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
```

**Handling:** If `supported` is `false`, the read-aloud button in the cook screen is not rendered. No fallback text, no tooltip, no banner. The button does not appear in the DOM.

This follows the progressive enhancement contract established in the cook-mode depth work. Hiding a feature that doesn't exist on the device is preferable to showing a disabled state with an explanation.

---

### Validation errors — recipe name empty

**Trigger:** User attempts to submit `EditRecipe.tsx` or `AddRecipe.tsx` with an empty name field, or blurs the name field while empty.

**Component:** `<FieldError id="recipe-name-error" message="Recipe name is required" />`

The name `<input>` gets:
```html
<input
  id="recipe-name"
  aria-invalid="true"
  aria-describedby="recipe-name-error"
  class="field__input field__input--invalid"
/>
```

The wrapping `<div>` gets class `field--invalid` which applies a red `1px` border to the input via CSS.

Submit is blocked while the name is empty: the submit button has `disabled` attribute and `aria-disabled="true"`.

---

### Validation errors — no steps in recipe

**Trigger:** User attempts to submit with `graph.nodes.length === 0`.

**Component:** `<InlineBanner variant="warning">` rendered above the steps list area.

```
message: "Add at least one step before saving."
```

No action. The steps section is immediately below the banner; the visual proximity is the affordance. Submit button remains disabled.

---

### Validation errors — serve time in the past

**Trigger:** User sets a serve time in `Home.tsx` that is earlier than `Date.now() + 60_000` (less than one minute from now).

**Component:** `<InlineBanner variant="warning">` below the serve-time picker.

```
message: "That time has already passed — your plan will start from now."
```

This is a warning, not a blocking error. The Build Plan button remains enabled. `compile()` receives `Date.now()` as `serveTime` when the user's selected time is in the past. The plan is still built; the user is just informed that their time was adjusted.

The warning updates live as the user changes the time picker — it appears when the condition is true and disappears when the condition is false, with no debounce delay.

---

### Error message copy — reference table

| Situation | Heading / Message | Variant | Blocking? |
|---|---|---|---|
| Browse catalog fetch fails | "Can't load recipes" + "Check your connection, then try again." | `ScreenErrorPanel` | No (fallback available) |
| Single recipe fetch fails / 404 | "Couldn't load this recipe" | `ScreenErrorPanel` | Yes (go back) |
| AI generate 429 | "AI limit reached — try again tomorrow, or add your own API key in Settings." | `InlineBanner error` | No (manual entry available) |
| AI generate 401 | "AI features need an API key to work." | `InlineBanner info` | No |
| PasteParser empty graph | "Couldn't parse this recipe — try pasting a different format, or use Ask AI." | `InlineBanner warning` | Yes (submit disabled) |
| Menu import no dishes | "No dish names found — try pasting just the dish names, one per line." | `InlineBanner warning` | No (re-paste available) |
| compile() throws | "Something went wrong building your plan" | `ScreenErrorPanel` | Yes within flow |
| IndexedDB unavailable | "Private mode detected — recipes you add won't be saved after you close this tab." | `InlineBanner warning` | No |
| WakeLock denied | (no message) | — | No |
| SpeechSynthesis absent | (button hidden) | — | No |
| Recipe name empty | "Recipe name is required" | `FieldError` | Yes (submit disabled) |
| No steps in recipe | "Add at least one step before saving." | `InlineBanner warning` | Yes (submit disabled) |
| Serve time in past | "That time has already passed — your plan will start from now." | `InlineBanner warning` | No |
| Unhandled render crash | "Something went wrong" | `ErrorBoundary` full-screen | Yes |

---

## Data & Dependencies

**`ErrorBoundary`** wraps `App.tsx`. No data dependencies. The mailto report link encodes `error.message` and `error.stack`.

**`useStorageMode`** runs once on app init, before any screen renders. Its result is passed down via a context (`StorageModeContext`) so any screen can read it without prop drilling. The `InlineBanner` for private mode is rendered in `App.tsx` where the context is established.

**Browse catalog error** depends on the fetch state managed in `Browse.tsx` and the personal library count from `usePersonalLibrary` hook. The fallback "show my saved recipes" path reads from `localStorage tutti.candidates` and IndexedDB `recipeStore` — both of which may themselves be unavailable (handled: if both are unavailable, a second empty-library panel is shown).

**compile() error** depends on `selectedRecipes` state surviving the error — it must not be cleared by the catch block. The Edit button navigates to Studio; the report link encodes `selectedRecipes.map(r => r.recipeId).join(',')`.

**AI error states** depend on the response status code being forwarded from the server route (`/api/recipe`) to the client. The server must return 429 and 401 as-is, not re-wrap them as 500. Verify in `server/routes/recipe.ts` that upstream AI provider errors are passed through with their original status.

**Validation errors** in `EditRecipe` and `AddRecipe` depend on form state local to those screens. No external data. The `parsedGraph` produced by `parseRecipe()` must be accessible to the submit-guard logic in the same component.

**WakeLock and SpeechSynthesis** are self-contained in their respective hooks (`useWakeLock.ts`, `useSpeechSynthesis.ts`). No data dependencies. Feature detection results are boolean flags consumed directly by the cook screen.

**`FieldError`** requires `id` props to be coordinated with the `aria-describedby` on the corresponding input — this is a naming convention, not a runtime data dependency. Convention: `<fieldName>-error` (e.g., `recipe-name-error`, `step-duration-error`).
