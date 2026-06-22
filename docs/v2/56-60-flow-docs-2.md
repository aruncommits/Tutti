# 56 — Flow: Cook Session States

## Overview

The cook session is the core experience Tutti exists to deliver. It is not a single screen but a stateful journey: from selecting dishes through building a plan, prepping ingredients, executing parallel steps, and logging the result. Every screen in the cooking path — Home, Preview, Ready (Mise), Cook, Finish — maps to a distinct session state. Understanding these states as a formal machine ensures that partial sessions survive interruption, that the engine is never called unnecessarily, and that the user is never dropped back to a blank slate after leaving mid-cook.

## Current State

The cook session is partially stateful but not formally modeled:
- `C:\Tutti\packages\web\src\App.tsx` holds `selectedRecipes`, `plan`, `cookStartedAt`, `nodeIndex` in `useState` hooks — no named session-state enum exists
- `cook-resume-autosave.md` (memory) confirms cook resume is shipped; timer-persistence and isPlan validator are pending
- `CookScreen.tsx` reads `cookStartedAt` and `nodeIndex` from props
- `ReadyScreen.tsx` (mise) shows ingredient checklist; "Start cooking" advances to cook
- `FinishScreen.tsx` exists and handles post-cook rating (partially)
- There is no single source of truth for "which phase of the cook journey am I in" — it is inferred from a combination of `screen === "cook"`, `plan !== null`, `cookStartedAt !== null`
- The ABANDONED state is detected only on re-open (resume banner) but not named or handled consistently if the user navigates to Browse mid-cook

## Problem

1. The session state is scattered across five independent booleans/values; any component reasoning about it must check multiple conditions in the right combination
2. There is no guard preventing Build Plan from overwriting an in-progress cook — if a user taps Browse, then taps Home, then taps Build Plan, the plan resets
3. The transition from COOKING to ABANDONED is implicit — the app has no moment where it explicitly decides "this was an abandonment"
4. The finish flow (rate → save) is partially implemented; the transition back to NOT_STARTED (clearing session) is not atomic
5. No test covers the full state machine path NOT_STARTED → IN_PREVIEW → IN_MISE → COOKING → COOKING_DONE → NOT_STARTED

## V2 Design

V2 formalizes the cook session as a named enum with a single `cookSessionState` derived value, computed from existing primitives so no migration is needed. Guards are added at the Build Plan action and at the tab bar so COOKING and IN_MISE sessions cannot be silently overwritten. The ABANDONED state becomes explicit: computed on app load if `cookStartedAt` is set but `screen !== "cook"`. The COOKING_DONE → NOT_STARTED transition becomes a single atomic `clearCookSession()` call.

## Spec

### State Enum

```ts
// packages/web/src/cookSession.ts
export type CookSessionState =
  | 'NOT_STARTED'
  | 'IN_PREVIEW'
  | 'IN_MISE'
  | 'COOKING'
  | 'COOKING_DONE'
  | 'ABANDONED';
```

### Derivation (computed, not stored)

```ts
export function deriveCookState(
  dishes: RecipeGraph[],
  plan: MasterExecutionPlan | null,
  cookStartedAt: number | null,
  nodeIndex: number,
  totalNodes: number,
  screen: Screen,
): CookSessionState {
  if (!cookStartedAt && !plan) return 'NOT_STARTED';
  if (plan && !cookStartedAt) return 'IN_PREVIEW';
  if (cookStartedAt && screen === 'ready') return 'IN_MISE';
  if (cookStartedAt && screen === 'cook' && nodeIndex < totalNodes) return 'COOKING';
  if (cookStartedAt && nodeIndex >= totalNodes) return 'COOKING_DONE';
  if (cookStartedAt && screen !== 'cook' && screen !== 'ready') return 'ABANDONED';
  return 'NOT_STARTED';
}
```

### State Table

| State | Screen | User Sees | Available Actions |
|---|---|---|---|
| NOT_STARTED | home | Dish picker, empty Gantt placeholder, Build Plan disabled | Add dishes, set serve time, Browse |
| IN_PREVIEW | preview | Gantt timeline, step list, reorder buttons | Start Cooking, Edit (→ home), Share |
| IN_MISE | ready | Ingredient checklist by dish | Check off items, Start Cooking, Back (→ preview) |
| COOKING (step N) | cook | NOW panel + NEXT + PASSIVE, timers | Complete step, Previous step, Read aloud, passive list |
| COOKING_DONE | finish | Summary of steps completed, rating cards per dish | Rate dishes, Add note, Save & Finish |
| ABANDONED | home | Resume banner at top of Home | Resume (→ cook at saved nodeIndex), Discard |

### Transitions

```
NOT_STARTED  ──[Build Plan]──────────────────────→  IN_PREVIEW
IN_PREVIEW   ──[Edit]───────────────────────────→  NOT_STARTED
IN_PREVIEW   ──[Start Cooking →]────────────────→  IN_MISE
IN_MISE      ──[Back]────────────────────────────→  IN_PREVIEW
IN_MISE      ──[Start Cooking]──────────────────→  COOKING (step 0)
COOKING      ──[Complete step, not last]─────────→  COOKING (step N+1)
COOKING      ──[Previous step]──────────────────→  COOKING (step N-1)
COOKING      ──[Complete final step]─────────────→  COOKING_DONE
COOKING_DONE ──[Save & Finish]──────────────────→  NOT_STARTED
COOKING      ──[navigate away]──────────────────→  ABANDONED
ABANDONED    ──[Resume]───────────────────────────→  COOKING (saved nodeIndex)
ABANDONED    ──[Discard]──────────────────────────→  NOT_STARTED
```

### Cook Guard

```ts
// In App.tsx, buildPlan():
function buildPlan() {
  const state = deriveCookState(...);
  if (state === 'IN_MISE' || state === 'COOKING') {
    // do not clear; show toast: "A cook session is in progress"
    return;
  }
  // proceed normally
}
```

### `clearCookSession()` (atomic reset)

```ts
function clearCookSession() {
  setPlan(null);
  setCookStartedAt(null);
  setNodeIndex(0);
  setSelectedRecipes([]);
  setScreen('home');
}
```

Called only from: Save & Finish in FinishScreen, and Discard in the Resume banner.

### Resume Banner

- Rendered in `HomeScreen.tsx` when `cookSessionState === 'ABANDONED'`
- Props: `onResume: () => void`, `onDiscard: () => void`, `dishNames: string[]`
- Style: full-width banner below tab bar, warning-color background, not dismissible without choosing
- `onResume`: sets `screen = 'cook'` (does not re-compile — reuses existing `plan` and `nodeIndex`)
- `onDiscard`: calls `clearCookSession()`

### Persistence

| Value | Storage |
|---|---|
| `cookStartedAt` | `localStorage` key `tutti.cookStartedAt` (number) |
| `nodeIndex` | `localStorage` key `tutti.nodeIndex` (number) |
| `plan` | `sessionStorage` (lost on browser close — triggers NOT_STARTED on fresh load) |
| `selectedRecipes` (recipeIds only) | `localStorage` key `tutti.sessionDishes` |

On app load: if `cookStartedAt` is set and `plan` cannot be restored (sessionStorage cleared), re-run `compile()` with saved recipeIds and cookStartedAt as the target serveTime, then set `screen = 'cook'` at saved `nodeIndex`.

### Edge Cases

- User closes tab mid-COOKING then reopens: `cookStartedAt` in localStorage survives; `plan` in sessionStorage does not; app re-compiles and shows resume banner
- User reaches COOKING_DONE but app crashes before "Save & Finish": next open sees `nodeIndex >= totalNodes` with `cookStartedAt` set → derive COOKING_DONE → FinishScreen shown automatically
- User discards ABANDONED session: all localStorage cook keys cleared; Home shows empty dish picker
- Multiple dishes, some timers still running at COOKING_DONE: FinishScreen shows remaining timers with a "Stop all timers" button

## Data & Dependencies

- `App.tsx`: owns all session state; `deriveCookState` imported from `cookSession.ts`
- `HomeScreen.tsx`: reads `cookSessionState`, renders Resume banner
- `CookScreen.tsx`: reads `nodeIndex`, `plan`, `cookStartedAt`
- `FinishScreen.tsx`: calls `clearCookSession` via prop
- `packages/engine/src/index.ts`: `compile()` called on resume if plan lost
- `localStorage` keys: `tutti.cookStartedAt`, `tutti.nodeIndex`, `tutti.sessionDishes`
- `sessionStorage` key: `tutti.plan` (serialized MasterExecutionPlan)
- Tests needed: `cookSession.test.ts` covering all 6 states + 9 transitions + guard + atomic reset

---

# 57 — Flow: Step Reorder

## Overview

The Preview screen gives users a "Your order" panel below the Gantt chart, listing every scheduled step as a draggable row. Using up/down arrows, the user can signal that they prefer to tackle steps in a different sequence — for example, starting the most cognitively demanding steps early while they are fresh, or grouping all oven steps together. The engine then re-computes the full timeline respecting both the manual preference and the hard dependency edges in the recipe graph. This is not a simple visual reorder; it triggers a real re-compile and the Gantt updates to reflect new projected times.

## Current State

- `PreviewScreen.tsx` renders a "Your order" section with step rows and ↑/↓ buttons
- `App.tsx` holds `order: string[]` (array of node IDs) in state; `setOrder` is passed to `PreviewScreen`
- `onReorder(ids)` in `App.tsx` calls `compile(selectedRecipes, kitchen, serveAt, { manualOrder: ids })` and updates `plan`
- `compile()` in `packages/engine/src/index.ts` accepts `manualOrder` option and adjusts scheduling hints while still respecting edge constraints
- ↑ disabled on first step, ↓ disabled on last step — implemented
- Gantt component (`GanttChart.tsx`) re-renders from new `plan.schedule[]` after re-compile
- `manualOrder` is not persisted — refresh resets to engine default

File paths:
- `C:\Tutti\packages\web\src\screens\PreviewScreen.tsx`
- `C:\Tutti\packages\web\src\App.tsx` (`onReorder`, `order` state)
- `C:\Tutti\packages\engine\src\index.ts` (`compile`)
- `C:\Tutti\packages\engine\src\types.ts` (`MasterExecutionPlan`, `ScheduledNode`)

## Problem

1. When a user moves a step "earlier" (↑) but the engine cannot schedule it earlier due to a prerequisite, the Gantt bar does not move — the user sees their action had no effect with no explanation
2. The up/down button affordance is slow for long cook sessions (10+ steps) — moving step 8 to position 2 requires 6 taps
3. There is no visual distinction between steps that CAN be freely reordered vs. steps that are constrained by dependencies — the user may waste time trying to move a locked step
4. After reorder, the "Your order" list numbering (1, 2, 3…) can diverge from the Gantt bar sequence in confusing ways, making it unclear which ordering the cook will actually follow
5. No indication that the order resets on refresh

## V2 Design

V2 adds constraint visibility: steps with dependency constraints show a lock icon and a tooltip explaining why they cannot move past a certain point. The reorder list makes it clear that it expresses a preference, not a command — copy change from "Your order" to "Preferred order (engine may adjust for timing)". A drag-to-reorder handle is added alongside ↑/↓ for long lists. After re-compile, steps whose times did not change despite reorder show a dim "No change in timing" inline note. The reset-on-refresh behavior is documented in a one-line footer note.

## Spec

### Component: `StepReorderList`

Location: `packages/web/src/components/StepReorderList.tsx`

Props:
```ts
interface StepReorderListProps {
  steps: ScheduledNode[];          // from plan.schedule[], in current manual order
  order: string[];                 // nodeId array (current manual order)
  onReorder: (ids: string[]) => void;
  isRecomputing: boolean;          // true while compile() is running
}
```

State:
```ts
const [localOrder, setLocalOrder] = useState<string[]>(order);
```

On mount and on `order` prop change: sync `localOrder` from prop.

### Step Row

```
[drag-handle] [step number] [dish color dot] [step label] [lock? 🔒] [↑] [↓]
```

- `drag-handle`: `⠿` icon, `cursor: grab`, mouse/touch drag triggers swap
- `step number`: 1-indexed position in `localOrder` (NOT in engine's schedule)
- `dish color dot`: `kindColorOf` of recipe name for visual grouping
- `lock icon`: shown when `node.constrainedBy.length > 0` (engine provides this in `ScheduledNode`)
- `↑` button: disabled when index === 0 OR when `node.constrainedBy` includes the step above
- `↓` button: disabled when index === lastIndex OR when next step's `constrainedBy` includes this node

### Up/Down Action

```ts
function moveUp(index: number) {
  const next = [...localOrder];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  setLocalOrder(next);
  onReorder(next);  // triggers re-compile in App.tsx
}
```

`moveDown` is symmetric. Both actions call `onReorder` immediately — no debounce. The Gantt re-renders when `plan` updates from the parent.

### Drag Reorder

- Use HTML5 drag-and-drop (`draggable` attribute) — no external library
- `onDragStart`: record `dragIndex`
- `onDragOver`: compute target index, update `localOrder` preview visually (CSS class `dragging-over`)
- `onDrop`: call `setLocalOrder(finalOrder)` and `onReorder(finalOrder)`

### Recompute State

While `isRecomputing === true`:
- Show a subtle spinner overlay on the Gantt (not on the list)
- Disable ↑/↓ and drag on the list
- Show "Recalculating…" in the Gantt header

### Constraint Tooltip

On lock icon hover (desktop) / tap (mobile):
```
"This step must come after [step name] — engine will keep this constraint"
```

Data source: `ScheduledNode.constrainedBy: string[]` (nodeIds). Cross-reference `plan.schedule` to get step names.

### "No timing change" indicator

After re-compile, compare previous `plan.schedule[i].startMinute` with new values for each node. If unchanged, show dim inline text: "Same timing" next to the step. Clear after 3 seconds.

### Re-compile call site in App.tsx

```ts
async function onReorder(ids: string[]) {
  setIsRecomputing(true);
  const newPlan = await compile(selectedRecipes, kitchen, serveAt, { manualOrder: ids });
  setPlan(newPlan);
  setIsRecomputing(false);
}
```

`compile` is synchronous today — wrap in `Promise.resolve()` or move to a worker in a future phase. `isRecomputing` becomes a brief flash for now.

### Reset-on-refresh Notice

Below the step list, in muted text: "Preferred order resets if you refresh the page."

### Accessibility

- ↑/↓ buttons: `aria-label="Move [step name] earlier"` / `"Move [step name] later"`
- Lock icon: `role="img"` `aria-label="Order constrained by [prerequisite name]"`
- List: `role="list"`, rows: `role="listitem"`

### Edge Cases

- Single step in plan: both ↑ and ↓ disabled; drag handle visible but non-functional
- All steps constrained (linear recipe with no parallelism): all ↑/↓ disabled; header note "This recipe has a fixed sequence"
- Reorder then change serve time: `order` state is preserved; re-compile uses both `manualOrder` and new `serveAt`
- `compile()` throws: catch error, revert `localOrder` to previous value, show toast "Could not reorder — engine error"

## Data & Dependencies

- `PreviewScreen.tsx`: renders `StepReorderList` and `GanttChart` side by side (or stacked on mobile)
- `App.tsx`: `order` state, `onReorder` handler, `isRecomputing` state
- `packages/engine/src/index.ts`: `compile()` with `manualOrder` option
- `packages/engine/src/types.ts`: `ScheduledNode` (needs `constrainedBy: string[]` field if not already present)
- `GanttChart.tsx`: re-renders from `plan.schedule[]`; no changes needed to GanttChart itself
- No persistence layer involved — manual order is session-only

---

# 58 — Flow: Recipe Customize

## Overview

"Make it mine" is how Tutti users adapt a server recipe to their kitchen, preferences, or skill level. The flow forks the canonical server copy into a personal copy, opens the full recipe editor, and saves the result to the user's personal library — all without modifying the original. The fork is invisible to the user: they simply edit and save. The distinction matters internally because forked recipes are unverified and will not appear in Browse; they appear only in Studio as the user's personal variants.

## Current State

- `App.tsx` has `editingRecipe: RecipeGraph | null` and `saveEditedRecipe(g)` and `cancelEdit()` functions
- `saveEditedRecipe(g)`: calls `setCandidates(...)`, `recipeStore.put(g)`, `setEditingRecipe(null)`, `setDetailRecipe(g)`, `recipeOriginScreen.current = "studio"`, `setScreen("recipe")`
- `cancelEdit()`: navigates to "studio" if recipe is personal, "browse" if recipe is server-side
- The fork logic (new recipeId for verified recipes) is in `App.tsx` before calling `setEditingRecipe`
- `RecipeEditor` (`packages/web/src/components/RecipeEditor.tsx`) receives `recipe`, `onSave`, `onCancel`
- Entry point 1: `RecipeDetailScreen` "Make it mine" button → `onEdit()` prop → `App.tsx` calls `editRecipe(recipe)`
- Entry point 2: Studio recipe card "Edit" button → `editRecipe(recipe)` in App.tsx
- Verified recipes: `recipe.verified === true` (server catalog); personal: `verified === false`

File paths:
- `C:\Tutti\packages\web\src\App.tsx`
- `C:\Tutti\packages\web\src\screens\RecipeDetailScreen.tsx`
- `C:\Tutti\packages\web\src\screens\StudioScreen.tsx`
- `C:\Tutti\packages\web\src\components\RecipeEditor.tsx`
- `C:\Tutti\packages\engine\src\types.ts` (`RecipeGraph`)

## Problem

1. When a user edits a server recipe and saves, they land on the RecipeDetail screen for their new personal fork — but the header still shows the original name with no indication they are now viewing their copy
2. The fork recipeId format (`recipeId + "-custom-" + Date.now()`) is leaking implementation detail into user-visible state; if the user opens the URL or inspects storage it is opaque
3. There is no "diff" or change summary shown after editing — the user cannot see what they changed from the original
4. Cancelling an edit of a new (unsaved) recipe created via Studio "New recipe" navigates to Studio — correct. But cancelling an edit of a server recipe fork navigates to Browse, which loses the user's context (they came from the recipe detail screen, not Browse directly)
5. If the user edits a recipe, saves it, then edits again (from Studio), the second edit still forks (because the first fork is now verified=false but the fork check uses `recipe.verified` which is correct — this is actually fine, but not tested)

## V2 Design

V2 adds a "Personal copy" badge on RecipeDetailScreen when viewing a forked recipe, so the user knows they are seeing their version. The cancel-from-edit navigation is fixed for the case where the user arrived at editRecipe from the recipe screen (not Browse directly): cancel returns to the recipe screen, not Browse. A lightweight "unsaved changes" guard is added to prevent accidental cancellation after edits have been made. The recipeId fork format is preserved as-is (it is storage-only and never shown in UI).

## Spec

### Fork Logic (App.tsx `editRecipe`)

```ts
function editRecipe(recipe: RecipeGraph) {
  let toEdit = recipe;
  if (recipe.verified) {
    toEdit = {
      ...recipe,
      recipeId: `${recipe.recipeId}-custom-${Date.now()}`,
      verified: false,
      sourceRecipeId: recipe.recipeId,   // NEW: track origin
    };
  }
  setEditingRecipe(toEdit);
  setScreen('editRecipe');
}
```

`sourceRecipeId` added to `RecipeGraph` type:
```ts
// packages/engine/src/types.ts
interface RecipeGraph {
  // existing fields...
  sourceRecipeId?: string;  // set when forked from a server recipe
}
```

### RecipeEditor Props (no change to interface)

```ts
interface RecipeEditorProps {
  recipe: RecipeGraph;
  onSave: (g: RecipeGraph) => void;
  onCancel: () => void;
}
```

### Unsaved Changes Guard (new in RecipeEditor)

```ts
const [isDirty, setIsDirty] = useState(false);
// Set isDirty = true on any field change
// On onCancel():
if (isDirty) {
  // show confirm dialog: "Discard changes?" [Keep editing] [Discard]
  // if Discard confirmed: onCancel()
} else {
  onCancel();
}
```

Dialog uses `window.confirm()` for V2 (replace with custom modal in V3).

### Cancel Navigation (App.tsx `cancelEdit`)

```ts
function cancelEdit() {
  setEditingRecipe(null);
  // If we came from the recipe detail screen (recipe is a fork we just created
  // but haven't saved — recipeOriginScreen.current tracks where recipe detail was from)
  if (editingRecipe?.sourceRecipeId && recipeOriginScreen.current === 'browse') {
    setScreen('browse');
  } else if (candidates.some(c => c.recipeId === editingRecipe?.recipeId)) {
    setScreen('studio');
  } else {
    setScreen('browse');
  }
}
```

### Save Flow (App.tsx `saveEditedRecipe`)

```ts
function saveEditedRecipe(g: RecipeGraph) {
  // Update candidates
  setCandidates(prev =>
    prev.some(c => c.recipeId === g.recipeId)
      ? prev.map(c => c.recipeId === g.recipeId ? g : c)
      : [...prev, g]
  );
  // Persist
  recipeStore.put(g);
  // Navigate to recipe detail
  setEditingRecipe(null);
  setDetailRecipe(g);
  recipeOriginScreen.current = 'studio';
  setScreen('recipe');
}
```

No changes to this flow from current — existing implementation is correct.

### RecipeDetailScreen: "Personal copy" badge

When `recipe.verified === false && recipe.sourceRecipeId`:
- Show badge below recipe name: `Your version` (pill, muted accent color)
- Show link: `Based on [original name]` (requires resolving `sourceRecipeId` against `allRecipes`)

```ts
const originalRecipe = allRecipes.find(r => r.recipeId === recipe.sourceRecipeId);
// render: <span>Based on <button onClick={() => openOriginal(originalRecipe)}>Tagine</button></span>
```

`openOriginal`: sets `detailRecipe = originalRecipe`, `recipeOriginScreen.current = 'studio'`, `setScreen('recipe')`.

### RecipeDetailScreen: Entry Point Button

For server recipes (`recipe.verified === true`):
- Button label: `Make it mine`
- On tap: `onEdit(recipe)` → `editRecipe(recipe)` in App.tsx

For personal recipes (`recipe.verified === false`):
- Button label: `Edit`
- On tap: same flow, but no fork (recipeId preserved)

### Studio Card: Edit Entry Point

Studio recipe card shows "Edit" button for all personal recipes. No change needed — already calls `editRecipe(recipe)`.

### Edge Cases

- User taps "Make it mine", makes no changes, taps Save: fork is saved with no changes — valid; the fork still appears in Studio as personal copy. No warning needed (user chose to save explicitly)
- User taps "Make it mine", makes changes, force-closes browser: no auto-save of editor state; on reopen, editingRecipe is null (sessionStorage not used for editor) — user sees Studio, their fork is NOT saved. This is known scope; auto-save of editor state is post-V2
- Recipe with no `sourceRecipeId` but `verified === false`: personal recipe created via "New recipe" or menu import; "Edit" button shown; no "Personal copy" badge shown (since it was never derived from a server recipe)
- `allRecipes` does not contain `sourceRecipeId` (server recipe was deprecated): "Based on [unknown]" — hide the link entirely; show badge only

## Data & Dependencies

- `App.tsx`: `editRecipe()`, `saveEditedRecipe()`, `cancelEdit()`, `editingRecipe` state, `recipeOriginScreen` ref
- `RecipeDetailScreen.tsx`: `onEdit` prop, `recipe.sourceRecipeId`, `recipe.verified` — badge logic
- `StudioScreen.tsx`: passes `editRecipe` as prop to recipe cards
- `RecipeEditor.tsx`: `isDirty` state, unsaved changes guard on cancel
- `packages/engine/src/types.ts`: `RecipeGraph.sourceRecipeId?: string` (new optional field)
- `packages/engine/src/validators.ts`: `isPlan` validator — no changes
- `recipeStore` (IndexedDB): stores full `RecipeGraph` including `sourceRecipeId`
- `localStorage` key `tutti.candidates`: serialized `RecipeGraph[]` including `sourceRecipeId`

---

# 59 — Flow: Weekly Planning

## Overview

Weekly planning is the rhythm layer that sits above individual cook sessions. Each Sunday, the user assigns meals to days of the upcoming week. Each day, they open the Cook tab to find their planned meal pre-loaded and ready to build. After finishing a cook, the result is logged to history. Shopping lists are generated for the full week in one step. This cycle — plan Sunday, cook daily, shop once — is what distinguishes Tutti from a recipe browser: it coordinates the kitchen across time, not just within a single meal.

## Current State

- `CalendarScreen.tsx`: weekly grid (Mon–Sun), each day shows assigned meal names, "+ Add" affordance — exists
- `MealsScreen.tsx`: history of finished cook sessions — exists
- `ShoppingScreen.tsx`: grocery list by aisle — exists (generates for current `selectedRecipes`, not a full week)
- `savedMeals: SavedMeal[]` in App.tsx: array of `{ recipeIds: string[], date: string, ratings: Record<string, number> }`
- `calendar: Record<string, string[][]>` in App.tsx: maps ISO date string to array of meal groups (each meal group is `recipeId[]`)
- Connection between Calendar and Home is partially implemented: tapping a calendar day can set `selectedRecipes` to load that meal into the Cook tab
- Shopping for "the full week" is not yet implemented — ShoppingScreen currently generates only for the active Cook tab selection
- "Assign tonight's plan" shortcut on calendar day is not yet implemented
- Ratings from FinishScreen are stored but not surfaced back onto calendar entries

File paths:
- `C:\Tutti\packages\web\src\screens\CalendarScreen.tsx`
- `C:\Tutti\packages\web\src\screens\MealsScreen.tsx`
- `C:\Tutti\packages\web\src\screens\ShoppingScreen.tsx`
- `C:\Tutti\packages\web\src\App.tsx`

## Problem

1. Calendar and Home are disconnected — assigning a meal to Wednesday does not mean Wednesday's cook is pre-loaded when the user opens Cook that morning; they have to re-select dishes manually
2. Shopping generates only for the current Cook tab selection; there is no "shop for the whole week" path
3. Finished cook sessions in Meals history have no link back to their calendar day — the user cannot see "I cooked this on Wednesday; how did it go?" from the Calendar view
4. The "plan Sunday" workflow requires navigating to Calendar, then Me tab, then back to Cook — there is no guided weekly-planning moment
5. Ratings from FinishScreen are not yet written back to calendar entries or shown on meal history cards

## V2 Design

V2 wires the three management screens (Calendar, Meals, Shopping) into a coherent weekly cycle. The key connection is bidirectional: Calendar → Cook (load a planned meal) and Cook → Calendar (log a completed cook). Shopping is upgraded to aggregate all meals assigned to the current week. Meals history cards show their calendar date and rating summary. A "Plan this week" shortcut is added to the Me tab header for Sunday/Monday (the natural planning moment).

## Spec

### Data Model

```ts
// Existing (App.tsx)
type CalendarEntry = {
  date: string;          // ISO: "2026-06-17"
  mealGroups: string[][]; // each group is recipeId[]
  finishedCookId?: string; // NEW: links to a finished cook in savedMeals
};

type SavedMeal = {
  id: string;            // uuid
  recipeIds: string[];
  serveTime: string;     // ISO datetime
  calendarDate?: string; // NEW: ISO date if this meal was planned
  ratings: Record<string, number>;  // recipeId → 1-5
  notes: string;
};
```

`calendar` in App.tsx changes from `Record<string, string[][]>` to `Record<string, CalendarEntry>`.

### Sunday Planning Flow

1. User opens Me tab → Calendar section
2. Weekly grid shows Mon–Sun; today highlighted; days with meals show dish names in small chips
3. User taps a future day (e.g., Wednesday) → bottom sheet slides up:

**Bottom sheet content:**
```
Wednesday, June 24
────────────────────
[ Assign tonight's plan ]   ← shown only if selectedRecipes.length > 0
[ Pick from saved meals ]   ← opens meal picker from savedMeals
[ Search recipes ]          ← opens Browse in a sheet
[ Add manually ]            ← text input for meal name (lightweight, no recipeId)
```

4. "Assign tonight's plan": copies current `selectedRecipes` recipeIds to `calendar[date].mealGroups`
5. "Pick a saved meal": list of past `savedMeals` sorted by date desc; tap to assign; copy recipeIds
6. After assignment: bottom sheet closes; calendar day updates to show dish chips

### Cook Tab: Morning Load

When Cook tab (Home) opens and today's ISO date has a calendar entry:
- If `selectedRecipes.length === 0` and `plan === null`: show banner at top of dish picker: `"Today: [Dish 1], [Dish 2] — Cook this"` with [Cook this] button
- [Cook this] button: resolves recipeIds from `calendar[today]` against `allRecipes`, calls `setSelectedRecipes(resolved)`, dismisses banner
- If `selectedRecipes.length > 0` (user already has dishes): do not override; no banner

### Weekly Shopping

`ShoppingScreen` receives a new `mode` prop:
```ts
type ShoppingMode = 'session' | 'week';
```

In `mode = 'week'`:
- Collect all `calendar[date].mealGroups` where date falls within current Mon–Sun
- Resolve all recipeIds to `RecipeGraph[]`
- Run shopping list aggregation across all recipes (consolidate by ingredient name, sum quantities)
- Section header: "Week of June 22–28" with meal summary ("6 meals, 4 dishes")

Entry point: "Shop for this week" button in Calendar screen (below the weekly grid) and in Me tab header.

```ts
function openWeeklyShopping() {
  const weekDates = getCurrentWeekDates(); // Mon–Sun ISO strings
  const allRecipeIds = weekDates
    .flatMap(d => calendar[d]?.mealGroups ?? [])
    .flat();
  const unique = [...new Set(allRecipeIds)];
  setShoppingRecipeIds(unique);
  setShoppingMode('week');
  setScreen('shopping');
}
```

### Finish Cook → Calendar Log

In `saveEditedRecipe` (FinishScreen save path in App.tsx — rename to `finishCookSession`):

```ts
function finishCookSession(ratings: Record<string, number>, notes: string) {
  const meal: SavedMeal = {
    id: crypto.randomUUID(),
    recipeIds: selectedRecipes.map(r => r.recipeId),
    serveTime: new Date().toISOString(),
    calendarDate: todayISO(),
    ratings,
    notes,
  };
  setSavedMeals(prev => [meal, ...prev]);
  // Back-link to calendar
  setCalendar(prev => {
    const entry = prev[todayISO()];
    if (entry) {
      return { ...prev, [todayISO()]: { ...entry, finishedCookId: meal.id } };
    }
    return prev;
  });
  clearCookSession();
}
```

### Calendar View: Finished Cook Indicator

Days with `finishedCookId`:
- Show green checkmark on the day cell
- Tap: bottom sheet with cook summary (dish names, ratings, date/time)

### Meals Screen: Calendar Date

Each meal card in MealsScreen:
- If `meal.calendarDate` is set: show date line "Cooked on Wednesday, June 18"
- If `meal.ratings` has values: show star row per dish
- "Cook again" button: loads `meal.recipeIds` into `selectedRecipes`, navigates to Cook tab

### "Plan this week" Shortcut

Shown in Me tab header when `dayOfWeek === 0 || dayOfWeek === 1` (Sunday or Monday):
```
"Plan this week →"
```
Tapping scrolls Calendar to the current week grid and highlights unplanned days.

### Persistence

- `calendar`: `localStorage` key `tutti.calendar` (JSON `Record<string, CalendarEntry>`)
- `savedMeals`: `localStorage` key `tutti.savedMeals` (JSON `SavedMeal[]`)
- Max stored: 52 weeks of calendar (365 entries); 200 savedMeals (older entries pruned by date, keeping last 6 months)

### Edge Cases

- Calendar entry with recipeIds that no longer exist in allRecipes or candidates: resolve returns null; skip; show "[Deleted recipe]" placeholder in calendar chips
- Multiple meal groups on one day (two separate dinners): bottom sheet shows both groups; shopping aggregates both
- Week spanning month boundary (e.g., June 28 – July 4): `getCurrentWeekDates()` handles this; shopping section header shows "Jun 28 – Jul 4"
- User assigns the same saved meal to three different days: fine; each day gets its own copy of the recipeId list
- Shopping in `week` mode with zero assigned meals: show empty state "No meals planned this week — add some from the Calendar"

## Data & Dependencies

- `App.tsx`: `calendar`, `savedMeals`, `shoppingRecipeIds`, `shoppingMode` state; `finishCookSession()`, `openWeeklyShopping()`
- `CalendarScreen.tsx`: day-tap bottom sheet, "Shop for this week" button, finished-cook indicators
- `MealsScreen.tsx`: `calendarDate` and `ratings` on meal cards; "Cook again" button
- `ShoppingScreen.tsx`: `mode` prop, `shoppingRecipeIds` prop (replaces implicit use of `selectedRecipes`)
- `FinishScreen.tsx`: passes `ratings` and `notes` to `finishCookSession`
- `HomeScreen.tsx`: today's plan banner
- `packages/engine/src/index.ts`: no new calls; existing `compile()` used when "Cook this" loads the plan
- `localStorage` keys: `tutti.calendar`, `tutti.savedMeals`

---

# 60 — Flow: Navigation Graph (Complete Map)

## Overview

Every screen in Tutti and every transition between them, documented as a single authoritative reference. This document is the source of truth for: which screens show the tab bar, which screens have a back button, what triggers each transition, and where each entry point lands. It exists so that new screens can be added without violating existing back-navigation contracts and so that automated navigation tests can be generated directly from this graph.

## Current State

Navigation is implemented in `App.tsx` via:
- `screen: Screen` state (union type in `state.ts`)
- `setScreen()` calls scattered across screen components and App.tsx handlers
- `recipeOriginScreen: MutableRefObject<Screen>` for back-from-recipe tracking
- `SCREENS` set in `validators.ts` for runtime validation
- Bottom tab bar with 5 tabs (V1): Home, Browse, Studio, Calendar, Settings
- V2 redesigns to 4 tabs: Cook, Browse, Studio, Me (confirmed in V2 decisions)

File paths:
- `C:\Tutti\packages\web\src\state.ts`
- `C:\Tutti\packages\web\src\validators.ts`
- `C:\Tutti\packages\web\src\App.tsx`
- `C:\Tutti\packages\web\src\components\TabBar.tsx`

## Problem

1. There is no single document listing every transition — screen-specific files each know their own transitions but no map of the whole graph exists
2. Some transitions are implicit (user taps a tab) and some are explicit (button press); the code does not distinguish them, making it hard to add transition guards
3. Screens that should hide the tab bar are determined by an ad-hoc array in `TabBar.tsx`; it's out of sync when new screens are added
4. The back button behavior is only partially spec'd — `recipeOriginScreen.current` handles the recipe case, but there is no general back-stack
5. V2 tab restructure (4 tabs) is not yet reflected in any spec document

## V2 Design

This document IS the V2 design for navigation. It establishes: the complete screen list, the complete transition list, which screens hide the tab bar, which screens have back buttons and where they go, and the tab ownership of each screen. No back-stack is introduced in V2 — transitions remain point-to-point, with `recipeOriginScreen.current` extended to a `prevScreen` ref covering all "temporary" screens.

## Spec

### Screen Enum (V2)

```ts
// state.ts — complete V2 Screen type
export type Screen =
  | 'onboarding'
  | 'kitchen'
  | 'home'
  | 'browse'
  | 'recipe'       // detail view (modal-like, opened from browse or studio)
  | 'studio'
  | 'addRecipe'
  | 'editRecipe'
  | 'menuImport'
  | 'preview'
  | 'ready'        // mise en place
  | 'cook'
  | 'finish'
  | 'shopping'
  | 'pantry'
  | 'calendar'
  | 'meals'
  | 'stats'
  | 'settings';
```

`stats` is listed here for completeness but is V3 scope. All others are V2.

### Tab Bar (V2 — 4 tabs)

| Tab | Label | Icon | Primary screen | Secondary screens |
|---|---|---|---|---|
| 0 | Cook | 🍳 | home | preview (implicit — tab stays on Cook) |
| 1 | Browse | 🔍 | browse | — |
| 2 | Studio | ✏️ | studio | — |
| 3 | Me | 👤 | calendar | meals, shopping, pantry, settings (sub-sections) |

Tab bar is HIDDEN on these screens:
```ts
const HIDE_TAB_BAR: Screen[] = [
  'onboarding', 'kitchen', 'addRecipe', 'menuImport',
  'recipe', 'editRecipe', 'preview', 'ready', 'cook', 'finish',
];
```

### Back Button Presence

Screens that show a back button and where it goes:

| Screen | Back goes to | Mechanism |
|---|---|---|
| kitchen | home or onboarding | `prevScreen` ref |
| recipe | browse or studio | `recipeOriginScreen.current` |
| editRecipe | recipe (if just saved) or studio or browse | `cancelEdit()` logic |
| addRecipe | studio | hardcoded |
| menuImport | studio | hardcoded |
| preview | home | hardcoded |
| ready | preview | hardcoded |
| cook | (none — back is disabled during active cook) | — |
| finish | (none — only forward: Save & Finish) | — |

Screens with NO back button (primary or modal-like):
`onboarding`, `home`, `browse`, `studio`, `calendar`, `meals`, `shopping`, `pantry`, `settings`

### Complete Transition Graph

```
# Onboarding
onboarding → kitchen      : "Set up my kitchen" CTA (slide 3)
onboarding → home         : "Start cooking" CTA (slide 3, sets kitchenSkipped=true)

# Kitchen Setup
kitchen → home            : "Done" button (kitchen saved)
kitchen → home            : "Skip for now" button (sets kitchenSkipped=true)

# Home (Cook tab)
home → browse             : Browse tab tap
home → studio             : Studio tab tap
home → calendar           : Me tab tap (renders CalendarScreen as default Me sub-screen)
home → settings           : Me tab tap → Settings section within Me
home → preview            : "Build Plan" button (requires dishes.length > 0, no active cook guard)
home → addRecipe          : "Paste a recipe" chip
home → addRecipe          : "Ask AI" chip
home → cook               : Resume banner "Resume" button (ABANDONED state)

# Browse
browse → home             : Cook tab tap
browse → studio           : Studio tab tap
browse → calendar         : Me tab tap
browse → recipe           : "View" button on dish card (sets recipeOriginScreen = 'browse')
browse → home             : "+ Add to tonight's plan" button on dish card (adds dish, navigates home)

# Recipe Detail (opened from browse or studio)
recipe → browse           : Back button (recipeOriginScreen.current === 'browse')
recipe → studio           : Back button (recipeOriginScreen.current === 'studio')
recipe → editRecipe       : "Make it mine" button (verified recipe → fork)
recipe → editRecipe       : "Edit" button (personal recipe → no fork)

# Studio
studio → home             : Cook tab tap
studio → browse           : Browse tab tap
studio → calendar         : Me tab tap
studio → addRecipe        : "+ New recipe" button
studio → menuImport       : "Import menu" button
studio → recipe           : Recipe card "Open" button (sets recipeOriginScreen = 'studio')
studio → editRecipe       : Recipe card "Edit" button

# Add Recipe
addRecipe → studio        : Back button
addRecipe → studio        : Save new recipe (success)

# Menu Import
menuImport → studio       : Back button
menuImport → studio       : "Save to library" (success, recipes added to candidates)

# Edit Recipe
editRecipe → recipe       : Save (saveEditedRecipe → setScreen('recipe'))
editRecipe → studio       : Cancel (personal recipe — recipe.verified === false)
editRecipe → browse       : Cancel (server recipe fork — recipe.sourceRecipeId set, origin was browse)

# Preview
preview → home            : "Edit" button
preview → ready           : "Start cooking →" button (sets cookStartedAt)

# Ready (Mise en Place)
ready → preview           : Back button
ready → cook              : "Start cooking" button (advances past ingredient checklist)

# Cook
cook → cook               : "Done" on a step (increments nodeIndex, stays on cook screen)
cook → cook               : "Previous" button (decrements nodeIndex, stays on cook screen)
cook → finish             : "Done" on the final step (nodeIndex reaches totalNodes)
cook → home               : (ABANDONED — user taps Cook tab or any tab — cookStartedAt persists, banner shown on home)

# Finish
finish → home             : "Save & Finish" button (calls clearCookSession, ratings saved)
finish → home             : "Skip rating" link (calls clearCookSession without ratings)

# Me — sub-sections (rendered within Me tab, no screen change)
calendar → shopping       : "Shop for this week" button (sets shoppingMode='week')
calendar → home           : Cook tab tap (with selected meal pre-loaded if "Cook this" tapped)
meals → home              : "Cook again" button (loads savedMeal.recipeIds into selectedRecipes)

# Shopping (from Me or from Cook tab)
shopping → (back)         : Back button → previous screen (calendar or home, tracked by prevScreen ref)

# Pantry
pantry → (back)           : Back button → previous screen

# Settings
settings → (back)         : Back button or Me tab tap returns to calendar (default Me sub-screen)
```

### `prevScreen` Ref (generalized from `recipeOriginScreen`)

```ts
// App.tsx
const prevScreen = useRef<Screen>('home');

function navigateTo(next: Screen) {
  prevScreen.current = screen;   // capture before changing
  setScreen(next);
}

function navigateBack() {
  setScreen(prevScreen.current);
}
```

`recipeOriginScreen` is folded into `prevScreen`. All "Back" buttons call `navigateBack()`. For screens with hardcoded back targets (preview → home, ready → preview), the back button ignores `prevScreen` and calls `setScreen('home')` / `setScreen('preview')` directly — these are not context-dependent.

### Screens With No Entry From Tab Bar

These screens can only be reached via explicit action, never by tapping a tab:

`onboarding`, `kitchen`, `addRecipe`, `menuImport`, `recipe`, `editRecipe`, `preview`, `ready`, `cook`, `finish`

Tapping any tab while on these screens navigates to the tab's primary screen and may trigger state guards (cook guard, unsaved-changes guard).

### Tab Tap While in Guarded Screen

| Current screen | Tab tapped | Guard | Behavior |
|---|---|---|---|
| cook (COOKING) | any tab | cook guard | Toast: "You're cooking! Finish or resume later." Tab change proceeds but banner shown on landing screen |
| editRecipe (dirty) | any tab | unsaved guard | Confirm dialog: "Discard changes?" — if confirmed, navigate; if not, stay |
| ready (IN_MISE) | any tab | none (not in active cook) | Navigate freely; cookStartedAt persists; state becomes ABANDONED |
| preview | any tab | none | Navigate freely; plan persists |

### Active Cook Tab State

When Cook tab is selected and `cookSessionState !== 'NOT_STARTED'`:
- Tab icon shows a green dot indicator
- Tapping Cook tab while already on Cook tab (same-tab tap) scrolls Home to the resume banner if ABANDONED, or no-ops if NOT_STARTED

### State.ts and Validators.ts (V2 changes)

```ts
// state.ts
export const SCREENS = new Set<Screen>([
  'onboarding', 'kitchen', 'home', 'browse', 'recipe', 'studio',
  'addRecipe', 'editRecipe', 'menuImport', 'preview', 'ready',
  'cook', 'finish', 'shopping', 'pantry', 'calendar', 'meals',
  'stats', 'settings',
]);
```

Add `'finish'` if not present (FinishScreen was previously missing from SCREENS in some versions).

## Data & Dependencies

- `C:\Tutti\packages\web\src\state.ts`: `Screen` type, `SCREENS` set
- `C:\Tutti\packages\web\src\validators.ts`: runtime screen validation
- `C:\Tutti\packages\web\src\App.tsx`: `screen` state, `navigateTo()`, `navigateBack()`, `prevScreen` ref, tab-tap handlers, cook guard
- `C:\Tutti\packages\web\src\components\TabBar.tsx`: 4-tab layout, `HIDE_TAB_BAR` array, active cook dot indicator
- All screen components: `onBack` prop (calls `navigateBack()` in guarded screens or `setScreen(hardcoded)` for non-contextual backs)
- `cookSession.ts`: `deriveCookState()` used by cook guard in tab-tap handler
- Navigation tests: generate from transition graph above — one test per row, verifying `screen` state after each trigger
