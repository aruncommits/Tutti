Now I have enough information from the codebase to write all five documents accurately. Let me compose them.

# 51 — Flow: First Run (Brand New User)

## Overview

The first-run flow covers every state transition from the moment a new user opens Tutti for the first time through their first complete cook. Because Tutti is local-first with no account requirement, "first run" is defined entirely by the `tutti.onboarded` flag being absent or false in localStorage. The flow has two branches: users who skip kitchen setup and users who fill it in. Both branches converge on the home screen and proceed through the same cook loop.

## Current State

- `OnboardingScreen` (`apps/web/src/OnboardingScreen.tsx`): 3 slides rendered as `CARDS[]`, dot-paged, with "Skip" (link button, calls `onDone` immediately) and "Next" / "Set up my kitchen" (CTA). `onDone` currently always calls `setScreen("kitchen")` from App.tsx — there is no skip-to-home branch.
- `App.tsx` line 415–425: guards the entire app with `if (!onboarded) return <OnboardingScreen onDone={() => { setOnboarded(true); setScreen("kitchen"); }} />` — skip and finish both go to kitchen.
- `KitchenScreen` (`apps/web/src/KitchenScreen.tsx`): stepper + toggle fields, "Save kitchen" button calls `onDone → setScreen("home")`.
- `Builder.tsx` (the home screen component): opens the `LibraryBrowser` inline when `selected.length === 0`, i.e. picker is visible by default when the plan is empty.
- There is no `KitchenNudgeBanner` component — this is a V2 addition.
- `addCandidate` in App.tsx: the single function that accepts a `RecipeGraph`, caches it in IndexedDB via `recipeStore.put`, adds the recipeId to `dishes[]`, and calls `setScreen("home")`.
- `buildPlan` in App.tsx calls `compile()`, runs `upsertSaved` to auto-save the meal, and calls `setScreen("preview")`.
- `startCooking` sets `cookStartedAt = Date.now()` and `setScreen("cook")`.
- `reset` (the finish-cook handler) calls `addRecent`, increments cook counts via `recordCook`, clears `cookStartedAt`, and calls `setScreen("home")`.
- There is no dedicated FinishScreen — the finish UI is the "Dinner is served" finale panel inside `CookScreen` when `allDone === true`.

## Problem

- "Skip" on the onboarding currently takes the user straight to the kitchen screen anyway. There is no true skip path — a brand-new user who doesn't know their burner count is forced to interact with a setup form before they can do anything.
- The home screen shows an empty plan but no targeted nudge explaining that skipping kitchen setup means the cook engine will use `DEFAULT_KITCHEN` assumptions. New users see "Your meal plan is empty" with no clear next step.
- The first-run journey has no concept of a resume: if the user installs the PWA, opens it, taps "Skip", browses one recipe, and then closes the app before building a plan, reopening restores the correct state (dishes[] in localStorage) — but the LibraryBrowser is collapsed by default if `selected.length > 0`.

## V2 Design

- Onboarding "Skip" calls `setOnboarded(true)` and `setScreen("home")` directly, bypassing kitchen. The `kitchenSkipped` flag (a new localStorage key `tutti.kitchenSkipped`) is set to `true`.
- Onboarding "Set up my kitchen" calls `setScreen("kitchen")` as today. After `KitchenScreen` completes, `setOnboarded(true)` and `setScreen("home")`.
- On home, when `kitchenSkipped === true` and `dishes.length === 0`, show a `KitchenNudgeBanner`: "Tutti is using default kitchen settings — set yours for a more accurate timeline. [Set up now] [Dismiss]". Dismiss sets a `tutti.kitchenNudgeDismissed` flag.
- Slide 3 of onboarding is replaced with a cook-screen screenshot or illustration showing the NOW/NEXT panel, with CTA "Start cooking" (equivalent to the current "Set up my kitchen" path — but the skip button label changes to "Skip kitchen setup").

## Spec

### State transitions — Branch A (Skip kitchen)

| Step | User action | State change | Screen |
|---|---|---|---|
| App cold open | — | `onboarded = false` (default) | `onboarding` |
| Slide 1 → 2 | Tap "Next" | `i` increments to 1 | `onboarding` (slide 2) |
| Slide 2 → 3 | Tap "Next" | `i` increments to 2 | `onboarding` (slide 3) |
| Slide 3 | Tap "Skip kitchen setup" | `onboarded = true`, `kitchenSkipped = true`, `setScreen("home")` | `home` |
| Home (empty plan) | — | `dishes = []`, `KitchenNudgeBanner` visible | `home` |
| Nudge banner | Tap "Browse recipes" or use the LibraryBrowser inline | LibraryBrowser open (already open by default because `dishes.length === 0`) | `home` |
| LibraryBrowser | Tap "+ Add" on Butter Chicken | `library.getRecipe(recipeId)` fetches graph → `addCandidate(graph)` → `candidates` updated, `recipeStore.put(graph)`, `dishes = [recipeId]`, `setScreen("home")` | `home` |
| Home (1 dish) | — | Dish card shown, `KitchenNudgeBanner` hidden (dishes not empty), `Build plan · ready ASAP` button visible | `home` |
| Optional: add more dishes | Tap "Find recipes" | LibraryBrowser opens | `home` |
| Build Plan | Tap "Build plan · ready ASAP" | `compile(selectedRecipes, toKitchenProfile(DEFAULT_KITCHEN), asapServe, pace)` → `plan` set, `upsertSaved` auto-saves meal to `tutti.meals` (kind: "saved"), `setScreen("preview")` | `preview` |
| Preview | Review Gantt timeline | — | `preview` |
| Optional reorder | Tap ↑/↓ | `setManualOrder`, `compile` rerun | `preview` |
| Start cooking | Tap "Start cooking" | `setScreen("ready")` | `ready` |
| Mise screen | Gather ingredients, check boxes | — | `ready` |
| Start cooking (Mise) | Tap "Start cooking" | `setCookStartedAt(Date.now())`, `setScreen("cook")`, `focusAtRef.current = Date.now()` | `cook` |
| Cook: step by step | Tap "✓ Done" per step | `applyEvent(plan, {type:"complete", nodeId})`, pace learning runs | `cook` |
| Last step done | Tap "✓ Done" | `allDone = true`, "Dinner is served" finale shown | `cook` (finale) |
| Rate and note | Tap stars, type note | `setRating`, `setNote` in `tutti.recipeNotes` | `cook` (finale) |
| Finish | Tap "Cook it again" (the only CTA in the finale) | `addRecent` adds a "recent" meal entry, `recordCook` increments cook counts, `setCookStartedAt(null)`, `setScreen("home")` | `home` |

### State transitions — Branch B (Set up kitchen)

| Step | User action | State change | Screen |
|---|---|---|---|
| Slide 3 | Tap "Start cooking" (last slide CTA) | `setScreen("kitchen")` | `kitchen` |
| KitchenScreen | Fill burners, pans, equipment toggles | `kitchen` object updated in `tutti.kitchen` | `kitchen` |
| Save kitchen | Tap "Save kitchen" | `setOnboarded(true)`, `setScreen("home")` | `home` |
| Home (empty) | — | `dishes = []`, no KitchenNudgeBanner (kitchen was set up) | `home` |
| → same as Branch A from "LibraryBrowser" step onward | | | |

### localStorage keys at each milestone

| Milestone | Keys set |
|---|---|
| After onboarding skip | `tutti.onboarded = true`, `tutti.kitchenSkipped = true`, `tutti.screen = "home"` |
| After kitchen setup | `tutti.onboarded = true`, `tutti.kitchen = {...}`, `tutti.screen = "home"` |
| After adding first dish | `tutti.candidates = [graph]`, `tutti.dishes = ["recipeId"]`, `tutti.screen = "home"` |
| After Build Plan | `tutti.plan = {...}`, `tutti.meals = [{kind:"saved",...}]`, `tutti.screen = "preview"` |
| After Start Cooking | `tutti.cookStartedAt = <epoch ms>`, `tutti.screen = "cook"` |
| After finish | `tutti.cookStartedAt = null`, `tutti.meals = [{kind:"saved",...},{kind:"recent",...}]`, `tutti.recipeNotes = {recipeId:{cookCount:1,...}}`, `tutti.screen = "home"` |

### Component details

- `KitchenNudgeBanner`: new component, renders when `kitchenSkipped === true && dishes.length === 0 && !kitchenNudgeDismissed`. Props: `onSetup: () => void` (→ `setScreen("kitchen")` + `setKitchenSkipped(false)`), `onDismiss: () => void`. CSS class `.kitchen-nudge`.
- `OnboardingScreen`: `onDone` prop splits into `onSetupKitchen: () => void` and `onSkip: () => void`. The "Skip" button calls `onSkip`; the final slide CTA ("Start cooking") calls `onSetupKitchen`. The "Next" button on slides 1 and 2 is unchanged.
- `App.tsx` guard: `<OnboardingScreen onSetupKitchen={() => setScreen("kitchen")} onSkip={() => { setOnboarded(true); setKitchenSkipped(true); setScreen("home"); }} />`
- `KitchenScreen` `onDone`: in Branch B (reached from onboarding), also calls `setOnboarded(true)`. In Branch A re-entry (from nudge), just updates kitchen and returns home; `kitchenSkipped` is cleared.

### Edge cases

- App closed mid-onboarding (before `setOnboarded(true)`): `onboarded` remains false, onboarding restarts at slide 0 on next open. `i` is not persisted.
- App closed after adding a dish but before Build Plan: `dishes = ["recipeId"]`, `candidates = [graph]` both persisted. On reopen, `onboarded = true`, so home screen loads. The `Builder` opens with one dish card shown and the LibraryBrowser collapsed (since `selected.length === 1 > 0`). The plan has not been built (`tutti.plan` holds the empty compile from the initial `usePersistentState` default).
- App closed after Build Plan but before cooking: `cookStartedAt = null`, `screen = "preview"`. On reopen, auto-resume check (`cookStartedAt != null`) does not fire. User lands on preview screen (persisted screen key).
- App reopened during an active cook (`cookStartedAt != null`, `plan.nodes.length > 0`, `screen !== "cook"`): the `useEffect` in App.tsx line 399 fires once on mount and calls `setScreen("cook")` — user drops back directly into cook mode.

---

# 52 — Flow: Recipe to Cook (Core Loop)

## Overview

The core loop is the repeating cycle from "I want to eat X tonight" to "X is on the table." Every cook in Tutti travels this path: find a recipe, add it to the plan, optionally add companions, build the parallel timeline, review it, gather ingredients, cook step by step, and finish. This document maps every node in that cycle, including multi-dish plans, mid-cook app closure, and the post-cook review.

## Current State

- `Builder.tsx` (home screen): the entry point. Inline `LibraryBrowser` for catalog search, plus "Paste a recipe" and "Ask AI" shortcuts that both navigate to `addRecipe` screen.
- `addCandidate` in App.tsx: the single function that accepts a `RecipeGraph`, caches it in IndexedDB, updates `dishes[]`, and returns to home. Used by all recipe sources (inline picker, Browse, AddRecipe, MenuImport via `pickLibraryRecipe`).
- `pickLibraryRecipe` in App.tsx: resolves a server recipeId to a full graph via `library.getRecipe()` then calls `addCandidate`. Used by the inline LibraryBrowser and BrowseScreen.
- `buildPlan` in App.tsx: calls `compile(selectedRecipes, toKitchenProfile(kitchen), target, pace, manualOrder)`, auto-saves the meal via `upsertSaved`, sets `cookStartedAt = null` (ending any prior cook), and navigates to preview.
- `reorderFlow` in App.tsx: updates `manualOrder[]` and recompiles the plan with the new order. Persisted to `tutti.manualOrder`.
- `startCooking` in App.tsx: called from `PreviewScreen.onStart → MiseScreen.onStart`. Sets `cookStartedAt = Date.now()` and navigates to cook.
- `CookScreen`: the finale (`allDone === true`) renders "Dinner is served" + inline rating/note per dish + "Cook it again" button.
- `reset` in App.tsx: the "Cook it again" handler. Calls `addRecent`, `recordCook` for all dishes, clears `cookStartedAt`, navigates to home. Note: the CTA label is "Cook it again" in the current code (line 346, CookScreen.tsx) — this is the only exit from the finale panel.
- Mid-cook resume: `cookStartedAt != null` → on app reopen, `useEffect` fires `setScreen("cook")`. The "‹ Leave cooking — resume anytime" link (CookScreen line 287) calls `onLeave → setScreen("home")` without clearing `cookStartedAt`, so the global cook bar appears.

## Problem

- The "Cook it again" label on the finish button is misleading — the user just finished cooking; they don't want to cook again right now. The intended action is "I'm done, go home." V2 renames this to "Finish cooking" (or "Done — save & go home").
- Adding a second dish while the plan is being cooked requires a two-tap confirm in the Builder (the `armedBuild` guard). This guard message is clear, but the Builder shows no visual indicator that a cook is in progress unless the resume bar is visible.
- Rating is inline in the CookScreen finale, not on a separate FinishScreen — this makes it easy to skip. V2 keeps it inline but ensures the user cannot miss it.
- `dishes[]` is not cleared after a cook finishes. On the next "Build Plan" the same dishes are pre-selected. This is intentional (re-cook same meal easily) but can confuse new users who think the app is stuck.

## V2 Design

- Rename "Cook it again" to "Finish cooking" (primary CTA) and add a secondary "Cook it again" link below — these are two distinct actions.
- "Finish cooking" calls `reset()`, which clears `cookStartedAt`, records the cook in recents, and returns to home with `dishes[]` still set (so the plan is ready for next time).
- `dishes[]` are NOT automatically cleared on finish. The home screen should show the previous plan as a "Recently cooked" reminder with a "Clear" affordance — not an empty state.
- The prevScreen ref (`recipeOriginScreen`) ensures that opening a recipe detail from Browse returns to Browse, not home. This is already implemented in App.tsx.

## Spec

### Full core loop state machine

```
Find recipe
  ├── A: Browse catalog (BrowseScreen / inline LibraryBrowser)
  │     → onAddRecipe(recipeId) → pickLibraryRecipe(recipeId)
  │     → library.getRecipe(recipeId) [async, may fetch from Supabase API]
  │     → addCandidate(graph) → dishes.push(recipeId), candidates.push(graph)
  │     → recipeStore.put(graph) [IndexedDB cache for offline cook]
  │     → setScreen("home")
  │
  ├── B: Personal recipe (Studio → onOpen → setDetailRecipe → setScreen("recipe"))
  │     → RecipeDetailScreen.onAdd → addCandidate(detailRecipe)
  │     → setScreen("home")
  │
  ├── C: Ask AI / Paste (Builder "Ask AI"/"Paste" → setScreen("addRecipe"))
  │     → AddRecipe tabs → parse → onAdd(graph) → addCandidate(graph)
  │     → setScreen("home") [addCandidate always returns home]
  │
  └── D: URL fetch (AddRecipe "Find online" tab)
        → fetchRecipeFromUrl(url) → parse → onAdd(graph) → addCandidate(graph)
        → setScreen("home")

Home (Builder) — plan building
  dishes[] contains at least one recipeId
  selectedRecipes = allRecipes.filter(dishes)
  previewPlan = compile(selectedRecipes, kitchenProfile, target, pace, manualOrder) [live, every render]

  Optional: add more dishes (repeat above)
  Optional: set serve time (ServeTimeOption toggle)
  Optional: adjust servings per dish (1×/2×/3× factor buttons)
  Optional: choose tier (Simple/Standard/Elaborate per dish)
  Optional: set cooking-for-N (people stepper, scales all dishes)

  Build Plan tap:
    if cookLive && !armedBuild → show warning, setArmedBuild(true), return
    if cookLive && armedBuild → proceed (discard prior cook)
    compile(selectedRecipes, kitchenProfile, target, pace, manualOrder) → plan
    setCookStartedAt(null)
    upsertSaved(meals, {id, name, dishIds, servings, target, kind:"saved"}) → tutti.meals
    setScreen("preview")

Preview (PreviewScreen)
  Displays: Gantt timeline, startTime, projectedServeTime, dish list with step counts
  "✓ Saved to your meals" hint shown (already saved by buildPlan)
  Optional reorder: ↑/↓ buttons → setManualOrder + recompile
  "Start cooking" → setScreen("ready")
  "Edit" → setScreen("home")

Mise (MiseScreen / screen="ready")
  buildShoppingList(recipes) → ingredient checklist
  requiredEquipment(recipes) → equipment checklist
  missingEquipment(recipes, kitchen) → alert if gaps
  Last-time reminders: recipes where notes[id].note || notes[id].rating are shown
  "Start cooking" → startCooking() → setCookStartedAt(Date.now()), setScreen("cook")
  "Back" → setScreen("preview")

Cook (CookScreen)
  plan rendered via deriveViewState(plan) → {active, queue, archive}
  NOW panel: active tasks (hands-on + passive)
    Passive: "▶ Start — it cooks itself" → startPassive countdown
    Hands-on: "✓ Done" → complete(nodeId) → applyEvent(plan, {type:"complete"}) + pace learning
  NEXT panel: upcoming steps
  DONE panel: completed steps (tap to undo)
  Global timers toolbar: presets (3/5/10/15/20m) + custom label/mins
  Voice control: "done", "timer 10 minutes", "what's next", "how long", "read step"
  Screen wake lock: active (useWakeLock)
  "‹ Leave cooking — resume anytime": setScreen("home"), cookStartedAt preserved

  Last step complete → allDone = true → "Dinner is served" finale:
    Per-dish rating (Stars, 1–5) → setRating → tutti.recipeNotes
    Per-dish note (text input) → setNote → tutti.recipeNotes
    Per-dish photo (file input) → resizeToThumb → tutti.photos
    "Finish cooking" (was: "Cook it again") → reset()

reset():
  addRecent(meals, {id, name, dishIds, kind:"recent"}) → tutti.meals
  recordCook(notes, id, Date.now()) per dish → tutti.recipeNotes
  setCookStartedAt(null)
  setScreen("home")
  dishes[] retained (same plan ready for re-cook)
```

### Multiple dishes

- Each dish is a separate `recipeId` in `dishes[]`.
- `compile(selectedRecipes, ...)` interleaves all dishes into a single `MasterExecutionPlan` with one `schedule[]` keyed by `nodeId`.
- The Gantt shows all dishes; the NOW panel may show active tasks from multiple dishes simultaneously.
- Rating at finish shows one row per distinct `recipeId` in `plan.nodes` (the `dishesForReview` prop, derived as `[...new Set(plan.nodes.map(n => n.recipeId))]`).

### Reordering steps

- User taps ↑/↓ in Preview's "Your order" section.
- `setOrder(ids)` (local display state, immediate) + `onReorder(ids)` (calls `reorderFlow` in App).
- `reorderFlow`: `setManualOrder(order)` + `compile(selectedRecipes, kitchenProfile, target, pace, order)` → `setPlan`. The engine honors the requested order where dependency and resource constraints allow.
- `manualOrder[]` persists in `tutti.manualOrder`. If the dish set changes (dishes added/removed), `order` resets to the engine's default time order via the `useEffect` keyed on `idsKey`.

### Closing app mid-cook (resume)

- `cookStartedAt` is set in `tutti.cookStartedAt` (localStorage, number epoch ms).
- `plan` is persisted in `tutti.plan` (validated by `isPlan`).
- `dishes[]` persisted in `tutti.dishes`.
- On reopen: App.tsx `useEffect` (runs once, `resumedRef` guard) checks `cookStartedAt != null && plan.nodes.length > 0 && screen !== "cook"` → calls `setScreen("cook")`.
- Passive countdown timers (`remaining` state) are lost on close — they are in-memory only. Named timers (`tutti.timers`) persist by end-time and resume correctly.
- Global cook bar (`cookBar`): shown on every non-cook screen when `cookInProgress = cookLive && cookDone < plan.nodes.length`. Provides "Resume" (→ setScreen("cook")) and "End" (→ `endCook()` → `setCookStartedAt(null)`, setScreen("home")).

### Rating each dish separately

- `dishesForReview` prop to `CookScreen` = `[...new Set(plan.nodes.map(n => n.recipeId))]` — one entry per distinct recipe in the plan.
- `onRate(id, n)` calls `setRating(notes, id, n)` → `tutti.recipeNotes`.
- `onNote(id, s)` calls `setNote(notes, id, s)` → `tutti.recipeNotes`.
- Each dish gets its own Stars row + text input + optional photo upload.

---

# 53 — Flow: Create Recipe (All 4 Paths)

## Overview

Tutti provides four paths to bring a new recipe into a user's personal library: paste raw text, fetch from a URL, ask the app's AI, and import from a menu. The first three paths share the `AddRecipeScreen` (screen "addRecipe") with tab switching. The fourth path uses the dedicated `MenuImportScreen` (screen "menuImport"). All paths ultimately call either `addCandidate` (selects the recipe into the current plan) or `saveToLibrary` (saves without selecting — used by menu import). Recipes saved via any path appear in Studio under "My recipes".

## Current State

- `AddRecipe.tsx` (`apps/web/src/AddRecipe.tsx`): tab state `"paste" | "online" | "ai"`. Paste uses `PasteParser` from `@tutti/ingest`. URL uses `fetchRecipeFromUrl`. AI uses `askAiForRecipe` (calls `/api/recipe` on the app server, which holds provider keys). All three paths produce a `ParseResult { graph: RecipeGraph | null, validation: { ok, errors, warnings } }`. On success, shows a preview card and "Add to my dishes" button → calls `onAdd(graph)` → `addCandidate`.
- `AddRecipe` is reached from: Builder home ("Paste a recipe" → `setScreen("addRecipe")`), Builder home ("Ask AI" → `setScreen("addRecipe")`), Studio → "New recipe" → `setScreen("addRecipe")`.
- `onBack` from `AddRecipe` → `setScreen("home")`.
- `MenuImportScreen.tsx` (`apps/web/src/MenuImportScreen.tsx`): paste restaurant menu text → `parseMenu(text)` (from `@tutti/ingest`) → dish name list → parallel `library.searchDishes({q: name, pageSize: 3})` per dish → fuzzy match → rows with status `searching | matched | miss | adding | added | error`. Add matched: `library.getRecipe(matchId)` → `onAdd(graph)`. Generate missed: `askAiForRecipe` + `PasteParser` → `compileRecipe` → `onAdd(graph)`. `onAdd` in this context is `saveToLibrary` (not `addCandidate`) — recipes are saved to Studio, not auto-added to the plan.
- `MenuImportScreen` is reached from Studio → "Import a menu" → `setScreen("menuImport")`. `onBack` → `setScreen("studio")`.
- `aiClient.ts` (`apps/web/src/aiClient.ts`): `fetchAiUsage()` checks server config. Returns `null` if no AI provider is configured. `askAiForRecipe(prompt)` posts to `/api/recipe`. The `aiUsage` state in `AddRecipe` starts as `undefined` (unchecked), is fetched when the "Ask AI" tab is activated.
- URL path: `fetchRecipeFromUrl(url)` is a browser-side fetch + parse — some sites block CORS. The UI warns about this.
- There is no separate "URL" screen — it is a tab within `AddRecipe`.

## Problem

- The "Add to my dishes" button on the parsed result immediately adds the recipe to the current plan AND navigates to home. Users who are in Studio creating a recipe for future use, not for tonight, are surprised when the plan changes.
- The tab is labeled "Find online" (not "URL") and the tab for AI is labeled "Ask AI". Path 2 in the spec prompt calls it "From URL tab" — the actual label is "Find online".
- `onBack` from `AddRecipe` always goes to `home`, even when reached from Studio. There is no `prevScreen` tracking for the AddRecipe screen.

## V2 Design

- When `AddRecipe` is reached from Studio ("New recipe"), `onAdd` should call `saveToLibrary` (not `addCandidate`) so the recipe is saved to My Recipes without affecting the plan. When reached from the Builder (home), `onAdd` calls `addCandidate` as today.
- `onBack` from `AddRecipe` should return to the caller: if reached from Studio, back → Studio; if reached from home, back → home. This requires the App to pass the correct `onBack` callback based on navigation context (already done for `editRecipe` via `recipeOriginScreen` — the same pattern applies).
- Menu import success confirmation: after all rows are `added`, show a "Done → Back to Studio" button prominently. Currently there is a "Done" link but it is at the bottom of the row list and easy to miss.

## Spec

### Path 1 — Paste

```
Screen: addRecipe (tab: "paste")
Entry: Builder "Paste a recipe" button → setScreen("addRecipe")
       Studio "New recipe" → setScreen("addRecipe") [with different onAdd callback]

State at entry:
  tab = "paste", text = "", result = null, error = null, busy = false

User pastes recipe text into <textarea> (rows=9)
  → text state updates

Tap "Parse recipe" (disabled if text.trim() is empty or busy):
  setBusy(true), setError(null), setResult(null)
  PasteParser().parse({source:"paste", text}) [sync/async, @tutti/ingest]
    → ParseResult { graph: RecipeGraph | null, validation: {ok, errors[], warnings[]} }
  setResult(parseResult)
  setBusy(false)

Result card shown:
  graph.name shown as tag
  "unverified" badge
  If validation.ok:
    "Parsed N steps. Looks valid — add it to your dishes."
    "Add to my dishes" button (enabled)
    → onAdd(graph) → addCandidate(graph) [from home] or saveToLibrary(graph) [from Studio]
    → if addCandidate: dishes.push(recipeId), setScreen("home"), toast implied by navigation
    → if saveToLibrary: candidates.push(graph), recipeStore.put(graph), NO navigation change
                        → show inline confirmation "Saved to My Recipes" + "Back to Studio" link
  If !validation.ok:
    Error list shown ("Needs a fix before cooking: ...")
    No add button

Error (exception thrown):
  setError(e.message)
  "Couldn't parse that: ..." shown
  User can fix the text and retry

Back link → onBack() → setScreen("home") or setScreen("studio")
```

### Path 2 — URL (Find online)

```
Screen: addRecipe (tab: "online")
Entry: same as Paste; user switches to "Find online" tab

State at entry (tab switch): url = "", result = null

User types/pastes URL into <input type="url">
Tap "Fetch recipe" (disabled if url.trim() empty or busy):
  setBusy(true)
  fetchRecipeFromUrl(url) [from @tutti/ingest — browser fetch + JSON-LD / heuristic parse]
    Success → ParseResult (same shape as Paste)
    Failure (CORS block, parse error, network) → throws Error

Result card: same rendering as Paste path
  "Add to my dishes" → onAdd(graph) → addCandidate or saveToLibrary

CORS failure:
  setError("...") 
  Hint shown: "Some sites block cross-origin requests. If it fails, copy the recipe text and use the Paste tab."

Back → same as Paste
```

### Path 3 — Ask AI

```
Screen: addRecipe (tab: "ai")
Entry: Builder "Ask AI" button → setScreen("addRecipe") with tab pre-set to "ai"
       OR user taps "Ask AI" tab while already on addRecipe

AI usage check (fires on tab activation if aiUsage === undefined):
  fetchAiUsage() → POST /api/usage or GET /api/config
    → AiUsage { remaining: number, used: number, free: number, providers: string[] }
      OR null (not configured)
  setAiUsage(result)

State when aiUsage === null (not configured):
  "Generate recipe" button disabled
  Hint shown: "AI isn't set up on this server yet. Add a provider key to apps/web/.env (see .env.example) and restart."
  User can still use Paste or Find online tabs

State when aiUsage is loaded and remaining > 0:
  <textarea rows=3> with placeholder "e.g. a quick paneer butter masala for 4, not too spicy"
  "✨ Generate recipe" button enabled if aiPrompt.trim() non-empty

Tap "✨ Generate recipe":
  setBusy(true), setError(null), setResult(null)
  askAiForRecipe(aiPrompt) → POST /api/recipe { prompt: aiPrompt }
    → { text: string, remaining: number }
  setAiUsage(u => ({...u, remaining: ai.remaining}))
  PasteParser().parse({source:"paste", text: ai.text}) → ParseResult
  setResult(parseResult), setBusy(false)

Result card: same as Paste path
  "Add to my dishes" → onAdd(graph)

AI errors (network / server / parse failure):
  setError(e.message)
  "Couldn't parse that: ..." alert shown

Usage exhausted (remaining === 0):
  Button disabled
  Hint: "0 of N free AI recipes left."

Back → same as Paste
```

### Path 4 — Menu Import

```
Screen: menuImport
Entry: Studio "Import a menu" button → setScreen("menuImport")
Back: setScreen("studio")

Phase A — input
  Optional <input> for restaurant name (style context for AI generation)
  <textarea rows=10> for menu text
  Hint: "Generation uses the app's AI (networked). PDF & photo import are coming next."
  Tap "Find dishes" (disabled if text.trim() empty):
    parseMenu(text) [from @tutti/ingest] → string[] of dish names
    rows = names.map(name => ({name, status:"searching"}))
    setRows(rows)

Phase B — resolution (parallel per dish)
  For each name i, concurrently:
    library.searchDishes({q: name, pageSize: 3}) [via RemoteProvider → /api/library/search]
      → {dishes: DishSummary[], total}
    hit = dishes[0]
    isLikelyMatch(name, hit.name) [Jaccard ≥ 0.6 or substring]:
      true  → row[i] = {status:"matched", matchId: hit.defaultRecipeId, matchName: hit.name}
      false → row[i] = {status:"miss"}
    network error → row[i] = {status:"miss"}

Phase B — display
  Bulk actions:
    "Add all matches" → addMatch for every row with status="matched"
    "✨ Generate all missing" → generate for every row with status="miss" (disabled if !aiReady)
  Per-row actions:
    status="matched": "＋" button → addMatch(i, row)
    status="miss": "✨" button → generate(i, row) (disabled if !aiReady)
    status="adding": disabled, "adding…" indicator
    status="added": "✓ added · matchName" shown in green, no further action
    status="error": "⚠ errorMessage" shown

addMatch(i, row):
  setRow(i, {status:"adding"})
  library.getRecipe(row.matchId) → full RecipeGraph
  onAdd({...graph, tags:[...(graph.tags??[]), "menu"]})
    → saveToLibrary(graph) → candidates.push, recipeStore.put
  setRow(i, {status:"added", detail: row.matchName})

generate(i, row):
  setRow(i, {status:"adding"})
  askAiForRecipe(`Write a recipe for "${row.name}"${restaurant ? `, ${restaurant}-style` : ""}`)
  → ai.text
  PasteParser().parse({source:"paste", text: ai.text}) → {graph}
  compileRecipe(graph, {name: row.name}) [engine normalization]
  onAdd({...compiledGraph, tags:["menu","ai"]})
    → saveToLibrary
  setRow(i, {status:"added", detail:"AI-generated"})

Success state:
  All rows show status="added"
  "← New menu" link: clears rows (setRows(null)), back to Phase A
  "Done" link: setScreen("studio")
  In Studio, all added recipes appear under "My recipes" (newest first, reversed candidates array)
```

### Error states summary

| Path | Error condition | UI response |
|---|---|---|
| Paste | Text unparseable | "Couldn't parse that: …" alert, retry allowed |
| Paste | Validation errors | Error list, no add button |
| URL | CORS block | Error alert + hint to use Paste tab |
| URL | Network failure | Error alert |
| AI | Not configured | "Generate recipe" disabled, setup hint |
| AI | Usage exhausted | "Generate recipe" disabled, count shown |
| AI | Server error | Error alert |
| Menu | Library search fails | Row falls to status="miss" |
| Menu | AI generation fails | Row set to status="error" with message |
| Menu | Library recipe fetch fails | addMatch catches, row set to error |

---

# 54 — Flow: Browse to Cook (Discovery to Dinner)

## Overview

Browse to Cook is the fastest path from "I want to try something new" to having that dish on the table. It begins on the Browse tab (full catalog, server-backed), proceeds through recipe selection, returns to the Cook tab (home screen) to build a plan, and flows through Preview → Mise → Cook. The key behaviors in this flow are: the prevScreen tracking that returns Browse users to Browse (not home) when they open a recipe detail, the guard against adding a recipe that conflicts with an in-progress cook, and the "already added" state in the browser.

## Current State

- `BrowseScreen.tsx`: thin wrapper around `LibraryBrowser` with a header and "Back" link. `onAddRecipe(recipeId)` → `pickLibraryRecipe(recipeId)` in App → `library.getRecipe` → `addCandidate`.
- `openLibraryRecipe(recipeId)` in App.tsx: called when user taps the ⓘ info button in LibraryBrowser. Fetches full graph → `setPreviewRecipe(graph)`. This opens the recipe in a `<Modal>` overlay (not a screen transition) with `RecipeDetailScreen` inside.
- `previewRecipe` modal: "Add" button → `addCandidate(previewRecipe)` + `setPreviewRecipe(null)`. "Edit" → `editRecipe(previewRecipe)` (forks a personal copy). Back → `setPreviewRecipe(null)`.
- `recipeOriginScreen` ref: set to `"browse"` or `"studio"` before calling `setScreen("recipe")`. Used by `RecipeDetailScreen.onBack → setScreen(recipeOriginScreen.current)`. The modal pattern bypasses this — the modal closes without any screen transition.
- `LibraryBrowser`: `selectedDishIds` prop marks dishes already in the plan with "✓ Added" state and `.on` class. Multi-tier dishes expand to tier picker on first tap; single-tier dishes add directly.
- Adding a recipe when a cook is in-progress: `addCandidate` succeeds (adds to candidates/dishes), then home is shown. `buildPlan` has the `armedBuild` guard for rebuilding while `cookLive`. There is no guard specifically at the "add recipe" stage.
- `cookBar` in Shell: the global resume bar is shown on all screens except cook when `cookInProgress`. It does not block Browse usage.

## Problem

- Opening a recipe from Browse takes the user to the "recipe" screen (full page). The `recipeOriginScreen` ref correctly tracks this, so Back returns to Browse — but only when using the `onDetails` path that calls `openLibraryRecipe`. The ⓘ button actually opens the modal overlay, not the full recipe screen, so the prevScreen mechanism is not used in practice for Browse.
- "Already added" state is shown in the Browse list (`isOn = selected.has(d.dishId)`), but tapping an "already added" dish still calls `onAddRecipe` which calls `addCandidate` again — this triggers a no-op in practice because `addCandidate` replaces by recipeId (`candidates.filter(c => c.recipeId !== g.recipeId), g`) and `setDishes` deduplicates by dish. But the user gets no feedback that the dish was already there.
- Adding a recipe while a cook is in-progress silently succeeds. The cook bar is visible on the Browse screen, so the user can see they are cooking, but there is no explicit guard.

## V2 Design

- "Already added" tap: show a brief inline toast "Butter Chicken is already in tonight's plan — [Remove it] or change servings on the Cook tab." Do not re-add.
- Adding while cooking: show a sheet/alert "You're currently cooking — adding a new dish won't start until you build a new plan. Add anyway?" with "Add" and "Cancel". This is advisory, not a hard block.
- The prevScreen tracking is correct. No change needed for Browse → recipe detail → Back → Browse.

## Spec

### Fastest path: Browse → Cook

```
Step 1: User taps "Browse" tab → setScreen("browse")
  BrowseScreen renders with LibraryBrowser (default: all categories, no query)
  API call: library.searchDishes({pageSize:12}) → result.dishes[]
  Categories loaded: library.getCategories() → CategoryCount[]

Step 2: User types "biryani" into search field
  Debounced 180ms → library.searchDishes({q:"biryani", pageSize:12})
  Result: dishes matching "biryani" across all categories

Step 3 (optional): User taps "Rice" category chip
  setActiveCategory("Rice") → re-search with {q:"biryani", category:"Rice", pageSize:12}

Step 4: User sees "Hyderabadi Biryani" card (tiers: 3 ways)
  d.tiers.length > 1 → card shows "Choose ▾" add button, "3 ways" chip

Step 5: User taps the card → expanded tier picker shown:
  "Simple · 40m", "Standard · 75m", "Elaborate · 120m"

Step 6: User taps "Standard · 75m"
  onAddRecipe("hyderabadi_biryani_moderate")
    → pickLibraryRecipe("hyderabadi_biryani_moderate") in App
    → library.getRecipe("hyderabadi_biryani_moderate") [async]
    → addCandidate(graph):
        candidates.push(graph)
        recipeStore.put(graph) [IndexedDB]
        dishes = ["hyderabadi_biryani_moderate"]
        setScreen("home")

Step 7: Home screen ("Cook" tab in V2)
  Builder renders with selected = [graph]
  Dish card: "Hyderabadi Biryani" · Standard · 75m · 1× · "✓ Added"
  "Build plan · ready ASAP" button visible
  LibraryBrowser collapsed (selected.length === 1 > 0, picking = false by default)

Step 8: Tap "Build plan · ready ASAP"
  (no cookLive, so no guard)
  compile([graph], toKitchenProfile(kitchen), asapServe, pace, manualOrder)
  upsertSaved(meals, meal) → tutti.meals
  setScreen("preview")

Step 9–end: Preview → Mise → Cook → Finish
  (same as Flow 52 core loop from Preview onward)
```

### State changes at each step

| Step | `dishes[]` | `candidates[]` | `screen` | Notes |
|---|---|---|---|---|
| Open Browse | unchanged | unchanged | "browse" | |
| Search "biryani" | unchanged | unchanged | "browse" | search state local to LibraryBrowser |
| Select tier | ["hyderabadi_biryani_moderate"] | [graph] | "home" | addCandidate fires |
| Build Plan | unchanged | unchanged | "preview" | plan compiled, meal auto-saved |
| Start cooking (Mise) | unchanged | unchanged | "cook" | cookStartedAt set |
| Finish | unchanged | unchanged | "home" | addRecent, recordCook |

### prevScreen behavior

The Browse screen opens recipe details in two ways:

**Way A — Modal overlay (current behavior):**
- User taps ⓘ on a dish card → `openLibraryRecipe(recipeId)` → `library.getRecipe` → `setPreviewRecipe(graph)`
- `RecipeDetailScreen` renders inside `<Modal>` overlay
- Modal Back (or outside click): `setPreviewRecipe(null)` → overlay closes, Browse screen still visible
- No screen transition occurs — prevScreen tracking is not needed

**Way B — Full-page recipe screen (V2 addition, currently exists for Studio):**
- `onDetails` prop wired in App to `openLibraryRecipe` which opens modal (Way A)
- To support full-page Browse→Recipe→Back→Browse: change `onDetails` in Browse context to call `setDetailRecipe(g)`, `recipeOriginScreen.current = "browse"`, `setScreen("recipe")`
- RecipeDetailScreen `onBack`: `setScreen(recipeOriginScreen.current)` → "browse"
- This is already implemented in App.tsx for Studio; Browse needs the same wiring

### Edge cases

**Adding a recipe already in the plan:**
- `LibraryBrowser` shows "✓ Added" badge when `selectedDishIds.includes(d.dishId)`
- Current behavior: tap "✓ Added" → `onAddRecipe(d.defaultRecipeId)` → `pickLibraryRecipe` → `addCandidate` → `setDishes` deduplicates (one variant per dish) — effectively a no-op if same tier, or a tier swap if different tier
- V2: if `selectedDishIds.includes(d.dishId)` and user taps the card, show inline toast "Already in tonight's plan" with "Go to plan →" link → `setScreen("home")`
- "Add another variant": if user taps a different tier of an already-added dish, `addCandidate` replaces the prior variant (existing behavior). Show "Switched to Standard" toast.

**Adding when plan is being cooked:**
- `cookInProgress = cookStartedAt != null && cookDone < plan.nodes.length`
- `cookBar` is shown at the top of Browse screen
- Adding succeeds (addCandidate runs); dishes[] gains the new recipeId
- Building a new plan requires the armedBuild two-tap confirm in Builder
- V2: show a non-blocking alert banner below the add button: "You're currently cooking. The new dish will be in your next plan — finish or abandon cooking first."
- Hard block NOT applied (addCandidate still runs) — advisory only

**Servings for a recipe added from Browse:**
- `factorOf(recipeId)` defaults to 1 (from `servingsFactor`, which is `{}` for new additions)
- `setPeopleScaled(n)` on home screen scales all selected dishes including newly added ones
- No serving adjustment is possible from Browse itself — must return to home

---

# 55 — Flow: Plan, Save, Restore

## Overview

Tutti auto-saves every built plan to the user's meal history, so no explicit "Save" action is required and no cook is ever lost. This document maps what "saved" means at each point in the lifecycle: when the save happens, what data is stored, how meals appear in the Meals tab, and how the user cooks a saved meal again. It also covers the mid-cook session persistence ("cook resume") that lets users close the app and return exactly where they left off.

## Current State

- `SavedMeal` type (`apps/web/src/meals.ts`): `{ id: string, name: string, dishIds: string[], servings: Record<string,number>, target: string, savedAt: number, kind: "saved" | "recent" }`.
- Auto-save on Build: `buildPlan()` in App.tsx calls `upsertSaved(meals, meal)` with `kind: "saved"` before navigating to Preview. The meal is saved at this point, not when cooking finishes. `upsertSaved` deduplicates by same dish-set (updates `savedAt` + `servings` + `target` in place, keeping the same `id`).
- Post-cook entry: `reset()` in App.tsx calls `addRecent(meals, {kind:"recent",...})`. The recent entry has the same `dishIds` but a different `id` and kind. `addRecent` collapses duplicate dish-sets in the recents list (capped at 10). Saved meals are untouched by `addRecent`.
- `PreviewScreen`: shows `<p className="hint">✓ Saved to your meals</p>` (line 129). This hint is always shown — it is accurate because `buildPlan` saves before navigating here.
- `MealsScreen`: splits meals into `saved` (kind:"saved") and `recent` (kind:"recent") sections. Each row has `onRestore(m)` (the "Cook it again" tap on the row).
- `restoreMeal` in App.tsx: sets `dishes`, `servingsFactor`, `serveAt` from the meal snapshot. If `cookLive` is false, calls `compileMealPlan` to build a plan immediately and navigates to Preview. If `cookLive` is true (a cook is in progress), falls back to Home — the Builder's armedBuild guard then protects the live cook.
- `cookStartedAt`: `tutti.cookStartedAt` (localStorage, number | null). Set to `Date.now()` by `startCooking()`. Cleared by `reset()` (finish) and `endCook()` (abandon). The auto-resume `useEffect` fires on mount: if `cookStartedAt != null && plan.nodes.length > 0 && screen !== "cook"` → `setScreen("cook")`.
- `compileMealPlan` in App.tsx: takes `(dishIds, servings, serveTime)`, filters to known recipes, scales, builds a probe compile to measure span, then compiles with ASAP target if no serve time was saved.

## Problem

- `SavedMeal.target` is typed as `string` but can be `null` in practice (the `serveAt` state can be null). The `restoreMeal` function calls `setServeAt(meal.target ?? null)` — the type should be `string | null` to match.
- `MealsScreen` idle text says 'build a plan and tap "Save this meal"' — but there is no "Save this meal" button. The save is automatic. The copy needs to reflect actual behavior.
- Dish names in `MealsScreen` are resolved via `nameOf(id) = recipes.find(r => r.recipeId === id)?.name ?? dishName(id)`. If a server recipe was added and then `allRecipes` does not include it (e.g., the IndexedDB cache was cleared), `dishName(id)` returns a fallback from `dishColors.ts` (likely the raw id). The display degrades gracefully but shows raw ids.
- The "Cook again" CTA in the `MealsScreen` row calls `onRestore(m)` which may navigate to Home (if cookLive) rather than Preview. The user is not told why they landed on Home instead of the plan.

## V2 Design

- `SavedMeal.target` typed as `string | null`.
- `MealsScreen` idle text: "No saved meals yet — build a plan and cook your first meal."
- When `restoreMeal` falls back to Home due to `cookLive`, show a transient banner on Home: "You're currently cooking — finish or abandon first, then tap the meal again."
- The "✓ Saved to your meals" hint on Preview is correct and should remain. No additional save step exists or is needed.

## Spec

### What "saved" means at each lifecycle point

| Lifecycle point | Action | `tutti.meals` state | Kind |
|---|---|---|---|
| User taps "Build plan" | `buildPlan()` → `upsertSaved` | New entry added (or existing same-dish-set entry refreshed) | `"saved"` |
| User opens Preview | — | Already saved; "✓ Saved to your meals" hint reflects this | `"saved"` |
| User taps "Start cooking" | `startCooking()` | No change to meals | — |
| User cooks and finishes | `reset()` → `addRecent` | New "recent" entry added (capped at 10 recents, same-dish-set deduped) | `"recent"` |
| User abandons cook | `endCook()` | No change to meals | — |
| User rebuilds same meal | `buildPlan()` → `upsertSaved` | Same-dish-set "saved" entry is refreshed in place (id preserved, savedAt/servings/target updated) | `"saved"` |

### SavedMeal data structure

```typescript
interface SavedMeal {
  id: string;           // "m{Date.now()}" for saved, "r{Date.now()}" for recent
  name: string;         // auto-derived: first 3 recipe names joined by ", " + "+N more" if >3
  dishIds: string[];    // recipeIds[] at time of build (ordered by dishes[] state)
  servings: Record<string, number>;  // servingsFactor snapshot (factor per recipeId)
  target: string | null;  // serve time HH:MM:SS or null (ASAP)
  savedAt: number;      // Date.now() at build time
  kind: "saved" | "recent";
}
```

### What is NOT saved

- **Serve time**: `target` is saved in `SavedMeal` but the user is expected to re-set it when restoring. `setServeAt(meal.target ?? null)` restores it from the snapshot — so it IS restored, but it may be stale (e.g., a 19:00 target from yesterday). The user should verify the serve time on the restored home/preview screen.
- **Step reorder**: `manualOrder[]` is NOT stored in `SavedMeal`. `compileMealPlan` in `restoreMeal` calls `compile` without a `manualOrder` argument, so the engine's default schedule is used. The user must re-apply any step reordering in Preview.
- **Timer progress**: in-memory passive countdowns (`remaining` state in CookScreen) are lost on app close. Named timers (`tutti.timers`) persist by end-time and survive reload, but if the timer end-time is in the past they will show "⏰ done."

### Mid-cook session persistence

```
Cook in progress:
  tutti.cookStartedAt = <epoch ms>  (set by startCooking)
  tutti.plan = <MasterExecutionPlan>  (set by buildPlan, recompiled on reorder)
  tutti.dishes = ["recipeId", ...]
  tutti.screen = "cook"

App closed during cook:
  All above keys persist in localStorage

App reopened:
  App.tsx usePersistentState reads: cookStartedAt (number), plan (MasterExecutionPlan), dishes (string[]), screen (Screen)
  useEffect (resumedRef, runs once on mount):
    if cookStartedAt != null && plan.nodes.length > 0 && screen !== "cook":
      setScreen("cook")
  → User drops back into CookScreen with the same plan state

Cook abandoned (user taps "End" on the global cook bar):
  endCook() → setCookStartedAt(null) → tutti.cookStartedAt = null
  setScreen("home")
  dishes[] unchanged, plan unchanged (ready to rebuild if wanted)

Cook finished (all steps done, user taps "Finish cooking"):
  reset():
    addRecent(meals, {kind:"recent", ...}) → tutti.meals
    recordCook(notes, id, at) per dish → tutti.recipeNotes  
    setCookStartedAt(null) → tutti.cookStartedAt = null
    setScreen("home")
    dishes[] unchanged (same plan ready for next cook)
```

### Restore a saved meal

```
User path:
  Tap "Me" tab → Meals section (or dedicated Meals screen)
  → MealsScreen shows:
      "Saved" section: meals where kind="saved", newest first, cap 50
      "Recently cooked" section: meals where kind="recent", newest first, cap 10

  Tap a meal row (aria-label "Cook [name] again"):
    onRestore(meal) → restoreMeal(meal)

restoreMeal(meal):
  known = new Set(allRecipes.map(r => r.recipeId))
  setDishes(meal.dishIds.filter(id => known.has(id)))
  setServingsFactor(meal.servings)
  setServeAt(meal.target ?? null)

  if cookLive (cookStartedAt != null && cookDone < total):
    // can't discard live cook without confirmation
    setScreen("home")
    // V2: show banner "Finish your current cook first"
  else:
    built = compileMealPlan(meal.dishIds, meal.servings, meal.target ?? null)
    if built:
      setCookStartedAt(null)  // clear any stale cook marker
      setPlan(built)
      setScreen("preview")
    else:
      // all dish IDs unknown (cache cleared, server offline)
      setScreen("home")
      // Home shows empty plan with the library browser open

compileMealPlan(dishIds, servings, serveTime):
  recipes = dishIds
    .filter(id => known.has(id))
    .map(id => scale(allRecipes.find(id), servings[id] ?? 1))
  if recipes.length === 0: return null
  probe = compile(recipes, kitchenProfile, serveTime ?? "20:00:00", pace)
  span = parseClock(probe.projectedServeTime) - parseClock(probe.startTime)
  target = serveTime ?? formatClock(nowMins + span)
  return compile(recipes, kitchenProfile, target, pace)
  // Note: no manualOrder — step order resets to engine default on restore
```

### Meals persistence caps and deduplication rules

| List | Cap | Deduplication rule |
|---|---|---|
| Saved meals (`kind:"saved"`) | 50 total | `upsertSaved`: same dish-set (order-independent) → update in place, keep id |
| Recent cooks (`kind:"recent"`) | 10 recents only | `addRecent`: same dish-set in recents → collapse (move to front, replace) |
| Total `tutti.meals` array | 60 (50 saved + 10 recent, in practice) | Saved and recent are independent lists — a saved and a recent can both have the same dish-set |

### "Cook again" from MealsScreen vs. "Cook it again" from CookScreen

These are two distinct actions with the same label in the current UI:

- **MealsScreen row tap** → `restoreMeal(meal)` → navigates to Preview (or Home if dishes unknown)
- **CookScreen finale "Cook it again"** → `reset()` → records recent cook → navigates to Home with same dishes still selected

V2 disambiguates: CookScreen finale button is renamed "Finish cooking" (primary). A secondary "Cook it again" link below calls `reset()` without the "done" semantics — implying the user will immediately rebuild the same plan.
