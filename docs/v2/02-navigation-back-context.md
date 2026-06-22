# 02 — Navigation: Back-Context Pattern

## Overview

The Back-Context Pattern is a navigation convention for Tutti's single-page screen state machine. Because Tutti uses a flat Screen union (no nested router stack), there is no implicit history to pop from. When a detail screen such as `recipe` or `editRecipe` is opened from multiple places, the naïve fix of hardcoding a return target breaks one of the callers. This document specifies a lightweight, ref-based mechanism for passing back-context so that every sub-screen returns the user to exactly where they came from, without adding persistent state that would survive app reloads or cause unnecessary re-renders.

---

## Current State

**Files involved:**
- `apps/web/src/App.tsx` — screen state machine, all navigation handlers, ref declarations
- `apps/web/src/state.ts` — `Screen` union type
- `apps/web/src/validators.ts` — `SCREENS` set (runtime guard)
- `apps/web/src/screens/RecipeDetailScreen.tsx` — `onBack` prop
- `apps/web/src/screens/StudioScreen.tsx` — calls `onOpen` with recipe id

**What works today:**
- `recipeOriginScreen` ref declared in `App.tsx` as `useRef<Screen>("browse")`
- Studio's `onOpen` sets `recipeOriginScreen.current = "studio"` before calling `setScreen("recipe")`
- `saveEditedRecipe` (called after editing from within the recipe detail view) sets `recipeOriginScreen.current = "recipe"` before calling `setScreen("editRecipe")`
- `RecipeDetailScreen` receives `onBack={() => setScreen(recipeOriginScreen.current)}` and uses it unconditionally

**What was broken before the fix:**
- `onBack` in `RecipeDetailScreen` called `setScreen("browse")` unconditionally
- Opening a recipe from Studio and pressing Back navigated the user to Browse, discarding their Studio context

**Still missing or undocumented:**
- `editRecipe` has no origin ref — it can be reached from Studio (new recipe flow) and from `RecipeDetailScreen` (edit existing), but Back always goes to a hardcoded target
- `addRecipe` has no origin ref — it can be reached from the Home dish-picker or from Studio
- No code comment convention establishes which refs exist, what their fallback is, or where they are set
- The pattern is applied in one place but has not been extended or documented for future screen pairs

---

## Problem

From a user's perspective:

1. A user is browsing their Studio library, opens a recipe, taps Edit. After editing, they press Back and land on Browse — two context switches away from where they started.
2. A user adds a new recipe from the Home screen dish-picker (to fill a gap in the plan). After saving, Back drops them in Studio, not back into their plan.
3. A developer adding a new detail screen copies the Browse hardcode because there is no documented convention, and the bug reproduces.

The root cause is that flat screen state has no history stack. The fix is cheap (a single `useRef`) but must be applied consistently and documented so it does not erode over time.

---

## V2 Design

**Core decision:** every sub-screen that can be reached from more than one origin must have a dedicated `useRef<Screen>` in `App.tsx`. The ref is written by the caller immediately before `setScreen()` is called, and read by the sub-screen's `onBack` handler. No persistent state (`useState`, `localStorage`, `sessionStorage`) is used for back-context.

**Why a ref and not state:**
- A state update schedules a re-render. Writing origin context immediately before a `setScreen()` call would produce two renders; a ref write is synchronous and free.
- A ref value does not survive an app reload. Back-context must not survive a reload — after reload the user is on the home screen and there is no "back" to return to.
- A ref update does not trigger React's reconciler, so the previous screen's teardown logic is not re-triggered.

**Tab-level back vs. cross-tab back:**
These are different problems and must not be conflated.

- *Cross-tab back* (this pattern): user navigates from tab A into a detail screen, presses Back, returns to tab A. Handled by origin refs.
- *Within-Cook-tab back*: the Cook tab is the only tab with a multi-step internal flow: `home → preview → cook`. These steps are not detail screens opened from multiple origins; they are a linear pipeline. Back in this sequence always moves one step left in the pipeline (`cook → preview`, `preview → home`). This is handled by hardcoded, always-correct targets — no ref needed — but the handlers must be centralized in App.tsx, not spread across screens.

**Fallback rule:** the default value passed to `useRef<Screen>(...)` must be the tab-home screen that is the most natural fallback for that sub-screen. It must be a valid member of the `Screen` union and must correspond to a tab root (not another sub-screen). If a sub-screen is only ever opened from one place, the fallback equals that one place and no multi-origin problem exists, but the ref and comment are still required for consistency.

---

## Spec

### TypeScript pattern

```typescript
// In App.tsx — declare near the top of the component, grouped with other origin refs:

/**
 * Back-context refs
 * Rule: write .current BEFORE calling setScreen(); read in the sub-screen's onBack.
 * Default value = the tab-home screen that is the safest fallback.
 * Never use useState here — back-context must not persist across reloads or cause re-renders.
 */
const recipeOriginScreen  = useRef<Screen>("browse");   // set by: browse onOpen, studio onOpen, saveEditedRecipe
const editRecipeOriginScreen = useRef<Screen>("studio"); // set by: studio newRecipe, recipeDetail onEdit
const addRecipeOriginScreen  = useRef<Screen>("home");  // set by: home addDish, studio newBlank
```

### Setting the ref — always immediately before setScreen()

```typescript
// Example: Studio opens a recipe for viewing
function handleStudioOpenRecipe(id: string) {
  selectedRecipeId.current = id;
  recipeOriginScreen.current = "studio";   // ← write context
  setScreen("recipe");                     // ← then navigate
}

// Example: RecipeDetail opens editRecipe
function handleRecipeDetailEdit() {
  editRecipeOriginScreen.current = "recipe";  // ← write context
  setScreen("editRecipe");                    // ← then navigate
}

// Example: Studio opens a blank new recipe (addRecipe flow)
function handleStudioNewRecipe() {
  addRecipeOriginScreen.current = "studio";  // ← write context
  setScreen("addRecipe");                    // ← then navigate
}

// Example: Home opens addRecipe to fill a plan slot
function handleHomeAddDish() {
  addRecipeOriginScreen.current = "home";    // ← write context
  setScreen("addRecipe");                    // ← then navigate
}
```

### Reading the ref in onBack

```typescript
// Pass as a prop to the screen component — do not pass the ref itself
<RecipeDetailScreen
  onBack={() => setScreen(recipeOriginScreen.current)}
  onEdit={() => {
    editRecipeOriginScreen.current = "recipe";
    setScreen("editRecipe");
  }}
  ...
/>

<EditRecipeScreen
  onBack={() => setScreen(editRecipeOriginScreen.current)}
  ...
/>

<AddRecipeScreen
  onBack={() => setScreen(addRecipeOriginScreen.current)}
  ...
/>
```

### Sub-screen onBack prop contract

Every screen component that is a "detail" screen (not a tab root) must accept an `onBack: () => void` prop. The component must never call `setScreen` directly — it calls `onBack()` and lets App.tsx resolve the target. This keeps navigation logic centralized.

```typescript
// Correct
interface RecipeDetailScreenProps {
  recipeId: string;
  onBack: () => void;
  onEdit: () => void;
}

// Incorrect — screen component should not know about Screen type
interface RecipeDetailScreenProps {
  recipeId: string;
  onBack: () => void;
  backTarget: Screen;   // ← do not do this
}
```

### Within-Cook-tab back (hardcoded, no ref needed)

```typescript
// Cook tab internal pipeline — linear, always correct, no multi-origin risk
<PreviewScreen
  onBack={() => setScreen("home")}        // preview → home (always)
  onStartCook={() => setScreen("cook")}
  ...
/>

<CookScreen
  onBack={() => setScreen("preview")}     // cook → preview (always)
  ...
/>
```

These handlers are intentionally hardcoded. Adding an origin ref here would imply Preview or Cook can be reached from multiple places — they cannot. If that ever changes, a ref must be introduced at that point.

### Comment convention in App.tsx

Every origin ref declaration must include an inline comment listing the callers that write to it:

```typescript
const recipeOriginScreen = useRef<Screen>("browse");
// Writers: handleBrowseOpenRecipe → "browse"
//          handleStudioOpenRecipe → "studio"
//          saveEditedRecipe (returning from editRecipe) → "recipe"
```

This makes it immediately auditable which code paths affect back-navigation without reading the full component.

### Validation (optional, debug builds only)

```typescript
// Utility — gates can be removed in production builds
function assertValidScreen(s: Screen, context: string): void {
  if (import.meta.env.DEV && !SCREENS.has(s)) {
    throw new Error(`[back-context] Invalid Screen "${s}" set by ${context}`);
  }
}

// Usage
recipeOriginScreen.current = "studio";
assertValidScreen(recipeOriginScreen.current, "handleStudioOpenRecipe");
setScreen("recipe");
```

---

## Data & Dependencies

| Item | Detail |
|---|---|
| `Screen` union type | `apps/web/src/state.ts` — all valid screen names; origin ref types must use this |
| `SCREENS` set | `apps/web/src/validators.ts` — used by the optional dev-mode assertion |
| `App.tsx` | Sole owner of all origin refs and all `setScreen()` calls |
| `RecipeDetailScreen` | Consumes `onBack`, `onEdit` — must not import `Screen` type or call `setScreen` |
| `EditRecipeScreen` | Consumes `onBack` — currently missing; ref `editRecipeOriginScreen` must be added |
| `AddRecipeScreen` | Consumes `onBack` — currently missing; ref `addRecipeOriginScreen` must be added |
| `StudioScreen` | Calls `onOpenRecipe`, `onNewRecipe` — these are the ref-write sites |
| `MenuImportScreen` | Opens from Studio only — Back is already correct; no ref needed, but `onBack={() => setScreen("studio")}` must remain hardcoded with a comment noting it is single-origin |
| `PreviewScreen` | Within-Cook-tab only — hardcoded `onBack`, no ref |
| `CookScreen` | Within-Cook-tab only — hardcoded `onBack`, no ref |

**Screens that do NOT need back-context refs (tab roots — they have no back):**
`home`, `browse`, `studio`, `calendar`, `settings`, `meals`

**Screens that need a ref but do not have one yet (V2 work items):**
- `editRecipe` → introduce `editRecipeOriginScreen`
- `addRecipe` → introduce `addRecipeOriginScreen`
