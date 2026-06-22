# 06 — Home Screen: Plan Builder

## Overview

The Home screen is the primary entry point for a cook session. It is a plan builder: the user assembles a set of dishes, sets a serve time, and compiles a parallel cooking timeline. The screen exists to answer one question — "What am I cooking and when do I need it ready?" — and hand off to the Preview screen with a complete execution plan. It is not a discovery surface (that is Browse) and not a recipe editor (that is Studio). Every design decision on this screen should reduce friction between "I know what I want to cook" and "the timer is running."

---

## Current State

**Files:**
- `apps/web/src/screens/HomeScreen.tsx` — main screen component
- `apps/web/src/components/DishCard.tsx` — individual dish card (name, servings spinner, tier buttons)
- `apps/web/src/components/NutritionStrip.tsx` — macro summary bar
- `apps/web/src/components/LibraryBrowser.tsx` — dish picker, currently rendered inline but full-height
- `packages/engine/src/compile.ts` — `compile(recipes, kitchen, serveTime) → MasterExecutionPlan`
- `apps/web/src/screens/PreviewScreen.tsx` — receives the compiled plan

**What works:**
- Dish cards render with name, servings stepper, and tier toggle (currently a separate row of buttons below the card name)
- `compile()` is synchronous and reliable; plan is passed to PreviewScreen via app state
- NutritionStrip aggregates macros from all selected dishes and displays at the bottom of the screen
- Serve time exists as a tappable link ("Change serve time") that opens a time picker modal
- Personal library (IndexedDB `recipeStore`) and server catalog are both browsable in LibraryBrowser

**What is broken or missing:**
- Serve time is hidden — users frequently miss it and tap "Build Plan" without realizing they can set a target time
- Tier toggle is a separate button row visually disconnected from the card; the relationship between card and tier is not obvious at a glance
- The dish picker (LibraryBrowser) navigates away from the Home screen rather than staying in context; returning from it loses scroll position in the plan area
- No dish limit warning — users can add unlimited dishes, producing plans that are cognitively overwhelming and potentially invalid
- NutritionStrip is always visible even with zero dishes selected, showing zeroed-out values that add visual noise
- "Build Plan" button shows no estimated duration — users cannot anticipate how long the cook will take before committing

---

## Problem

From a real user's perspective:

1. **Serve time is invisible.** The most important scheduling input — "when do I need this ready?" — is a small grey link near the bottom. Users building a weeknight dinner plan don't find it. They tap Build Plan, land on Preview, see a start time of "now," and have to navigate back to correct it. That round-trip breaks the planning flow.

2. **Tier choice is disconnected from the card.** Simple/Moderate/Complex buttons live below the card name in a separate row with no visual grouping. Users do not understand that tapping "Simple" changes the recipe variant for *that specific dish*. The affordance reads as a filter, not a per-card property.

3. **Adding a dish exits the planning context.** LibraryBrowser currently pushes a new screen. After picking a dish the user is returned to Home and has lost their sense of where they were in the plan. On mobile this feels like navigating away from work-in-progress.

4. **No guardrail on dish count.** Six simultaneous dishes already produces a dense Gantt. At eight or nine the timeline becomes illegible and cognitively unmanageable, but nothing warns the user. The failure mode is silent — they just get a very long, very crowded cook screen.

5. **Build Plan is a blind tap.** The button gives no indication of what it will produce. A user adding four dishes does not know if they are committing to a 20-minute plan or a 90-minute one. This creates hesitation or, worse, surprise on the Preview screen.

---

## V2 Design

### Serve time chip — always visible, top of plan area

The serve time moves from a hidden link to a persistent chip anchored at the top of the dish list. It reads either **"Cook now"** (when `serveAt` is null) or **"Ready at 7:30 PM"** (when a target time is set). Tapping it opens an inline time picker (native `<input type="time">` wrapped in a sheet). The chip is always visible regardless of how many dishes have been added. This placement communicates that serve time is a property of the plan, not an afterthought.

**Why a chip, not a field:** A chip reads as a selection that has a sensible default ("Cook now") rather than an empty input that demands filling. It reduces cognitive overhead — the user only needs to tap if the default is wrong.

### Dish card anatomy — everything on one card

Each dish card is a single coherent unit:

```
[color swatch] [dish name]                              [×]
               [Simple | Standard | Elaborate]   [− N +]
```

The color swatch (from `kindColorOf` / `ingredientColor.tsx`) gives a quick visual identity to each dish and doubles as a positional anchor when the list reorders. The tier seg-control is on the card itself — indented under the name — so the relationship is unambiguous. Servings stepper (`− N +`) sits on the same row as the tier control to keep the card compact. The remove button (`×`) is in the top-right corner, a conventional destructive-action position.

The tier labels change from Simple/Moderate/Complex to **Simple / Standard / Elaborate** in V2 (crisper language, middle tier no longer labeled as a degree of difficulty).

**Active tier state:** The selected tier button uses filled-accent style; the other two are ghost/outline. This is a segmented control, not a set of toggles — exactly one is always active per card.

### LibraryBrowser as inline bottom sheet

Tapping the `+ Add dish` button slides up a bottom sheet that overlays the plan area without navigating away. The sheet is 70% screen height on mobile and shows the full LibraryBrowser (search, category chips, server catalog + personal library). Selecting a dish closes the sheet and appends the dish to the plan. The plan area beneath the sheet remains mounted and stationary — scroll position is preserved.

**Implementation:** The sheet is a fixed-position overlay driven by a boolean `pickerOpen` state flag. LibraryBrowser receives an `onSelect(recipeId: string)` callback instead of dispatching to app navigation. No screen transition occurs.

### Nutrition strip — conditional display

NutritionStrip renders only when `selectedRecipes.length >= 1`. When zero dishes are selected the space collapses (no empty placeholder row). The strip shows per-person macros: **P: 32g · C: 58g · F: 14g · Cal: 620** — always per-serving so the numbers remain meaningful regardless of how many dishes are in the plan. Label is "Per person" in small caption text above the macro row.

### Build Plan button — shows estimated time

The button label is **"Build Plan (~45 min)"** where the duration estimate is computed eagerly before the user taps. The estimate is derived from a lightweight pre-compile pass: sum the `duration` values of the critical path nodes across all selected recipes (no full schedule computation, just a fast heuristic). If no dishes are selected the button is disabled and reads **"Add a dish to start"**. If one or more dishes are selected the button is enabled and shows the estimate.

The full `compile()` call still happens only when the button is tapped — the estimate is a read-only heuristic to reduce surprise.

### Dish limit — soft warning at 7+

At 6 dishes: normal behavior. At 7 dishes: a dismissible inline warning appears below the dish list — **"That's a lot of dishes — are you sure? The cook screen works best with 6 or fewer."** The `+ Add dish` button remains enabled and functional. The warning auto-dismisses if the user removes a dish and drops back to 6. This is a nudge, not a block.

---

## Spec

### Component tree

```
HomeScreen
├── ServeTimeChip                    # top of plan area
├── DishList                         # scrollable, flex-col gap-3
│   ├── DishCard (×N)
│   │   ├── ColorSwatch              # 8×24px vertical bar, kindColorOf(dish.name)
│   │   ├── DishName                 # truncated, font-semibold
│   │   ├── RemoveButton             # ×, top-right, aria-label="Remove {name}"
│   │   ├── TierControl              # segmented: Simple | Standard | Elaborate
│   │   └── ServingsControl          # − [N] +
│   └── DishLimitWarning             # renders when dishes.length >= 7
├── AddDishButton                    # "+ Add dish", full-width, outline style
├── NutritionStrip                   # conditional: only when selectedRecipes.length >= 1
├── BuildPlanButton                  # primary, full-width, disabled when 0 dishes
└── LibraryBrowserSheet              # bottom sheet overlay, controlled by pickerOpen
    └── LibraryBrowser (onSelect)
```

### State (HomeScreen)

```typescript
// Core plan state
const [dishes, setDishes] = useState<string[]>([])           // recipeIds in cook order
const [serveAt, setServeAt] = useState<string | null>(null)  // "HH:MM" or null
const [tiers, setTiers] = useState<Record<string, Tier>>({}) // recipeId → 'simple'|'standard'|'elaborate'
const [servings, setServings] = useState<Record<string, number>>({}) // recipeId → count

// UI state
const [pickerOpen, setPickerOpen] = useState(false)
const [timePickerOpen, setTimePickerOpen] = useState(false)
const [showLimitWarning, setShowLimitWarning] = useState(false)

// Derived
const selectedRecipes: RecipeGraph[] = useMemo(
  () => dishes.map(id => resolveRecipe(id, tiers[id] ?? 'standard', servings[id] ?? 2, allRecipes)),
  [dishes, tiers, servings, allRecipes]
)

const estimatedMinutes: number = useMemo(
  () => estimateCookTime(selectedRecipes),  // heuristic, see below
  [selectedRecipes]
)
```

### ServeTimeChip

```typescript
interface ServeTimeChipProps {
  serveAt: string | null          // "HH:MM" or null
  onChange: (value: string | null) => void
}
```

- Renders as `<button className="serve-time-chip">` — pill shape, accent border, font-medium
- Label: `serveAt ? "Ready at " + formatTime(serveAt) : "Cook now"`
- Secondary icon: clock SVG, left of label
- On tap: sets `timePickerOpen = true`; time picker sheet opens
- Time picker: native `<input type="time">` in a bottom sheet with "Cook now" reset link and "Set time" confirm button
- CSS: `serve-time-chip` — `display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; border: 1.5px solid var(--accent); font-size: 0.875rem;`

### DishCard

```typescript
interface DishCardProps {
  recipeId: string
  recipe: RecipeGraph
  tier: Tier
  servings: number
  onTierChange: (tier: Tier) => void
  onServingsChange: (n: number) => void
  onRemove: () => void
}
```

- Root: `<div className="dish-card">` — `border-radius: 12px; border: 1px solid var(--border); padding: 12px; display: grid; grid-template-columns: 8px 1fr auto;`
- ColorSwatch: `<div className="dish-swatch">` — `width: 8px; border-radius: 4px; background: kindColorOf(recipe.name); align-self: stretch;`
- Card body (middle column): dish name on top row; TierControl + ServingsControl on second row
- RemoveButton: `<button aria-label="Remove {recipe.name}" className="dish-remove">` — `×` character, positioned top-right of the card body
- Minimum servings: 1; maximum: 12; stepper taps increment/decrement by 1
- TierControl labels: `Simple` / `Standard` / `Elaborate` (map to engine tiers `simple` / `standard` / `elaborate`)
- Active tier: `background: var(--accent); color: var(--on-accent)` — inactive: `background: transparent; border: 1px solid var(--border)`

### TierControl

```typescript
interface TierControlProps {
  value: Tier
  onChange: (tier: Tier) => void
}
const TIERS: { key: Tier; label: string }[] = [
  { key: 'simple',    label: 'Simple'    },
  { key: 'standard',  label: 'Standard'  },
  { key: 'elaborate', label: 'Elaborate' },
]
```

- Renders as `<div role="group" aria-label="Recipe complexity" className="tier-control">`
- Each option: `<button role="radio" aria-checked={value === key}>` — no radio inputs, purely button-based for styling control
- CSS: `tier-control` — `display: flex; border-radius: 6px; overflow: hidden; border: 1px solid var(--border);` with each button `flex: 1; padding: 4px 0; font-size: 0.75rem; border: none;`

### DishLimitWarning

```typescript
// Renders when dishes.length >= 7
// Auto-shown; dismissed by user or when dishes.length drops to ≤ 6
```

- `<div className="dish-limit-warning" role="alert">`
- Text: "That's a lot of dishes — are you sure? The cook screen works best with 6 or fewer."
- Dismiss button: `×` top-right
- CSS: `background: var(--warning-bg); border: 1px solid var(--warning-border); border-radius: 8px; padding: 10px 12px; font-size: 0.8125rem;`
- `useEffect`: when `dishes.length` drops below 7, `setShowLimitWarning(false)`

### NutritionStrip

```typescript
interface NutritionStripProps {
  recipes: RecipeGraph[]   // only rendered when recipes.length >= 1
  // macros are aggregated from recipe.nutrition × recipe.servings, then divided by total servings
}
```

- Renders: `<div className="nutrition-strip">` — `display: flex; gap: 16px; padding: 10px 16px; background: var(--surface-2);`
- Caption above row: "Per person" in `font-size: 0.6875rem; color: var(--text-muted)`
- Macro pills: **P: 32g · C: 58g · F: 14g · Cal: 620** — interpunct `·` as separator, monospace numbers
- If a recipe has no nutrition data, that dish contributes 0 to the aggregate (no error thrown)
- Collapses to `display: none` when `recipes.length === 0` (CSS-driven, not unmounted, to avoid reflow flash)

### BuildPlanButton

```typescript
// Derived label
const buttonLabel = dishes.length === 0
  ? "Add a dish to start"
  : `Build Plan (~${estimatedMinutes} min)`

// estimateCookTime heuristic
function estimateCookTime(recipes: RecipeGraph[]): number {
  // For each recipe, find the critical path: longest sum of node durations on any path root→leaf
  // Sum critical paths across all recipes (parallel cook reduces total, but use sum as conservative upper bound)
  // Return Math.ceil(totalSeconds / 60)
}
```

- `<button className="build-plan-btn" disabled={dishes.length === 0}>`
- Full-width, `padding: 14px`, `border-radius: 10px`, `font-size: 1rem; font-weight: 600`
- Active: `background: var(--accent); color: var(--on-accent)`
- Disabled: `opacity: 0.4; cursor: not-allowed`
- On tap: calls `compile(selectedRecipes, kitchen, resolvedServeTime)` — synchronous; result passed to PreviewScreen via app state transition `navigateTo('preview', { plan, dishes: selectedRecipes })`
- `resolvedServeTime`: if `serveAt` is null, use `Date.now()` formatted as "HH:MM"

### LibraryBrowserSheet

```typescript
interface LibraryBrowserSheetProps {
  open: boolean
  onClose: () => void
  onSelect: (recipeId: string) => void
  excludeIds: string[]    // already-added dishes — shown as disabled in browser
}
```

- Overlay: `<div className="sheet-overlay" aria-hidden={!open}>` — `position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100`
- Sheet: `<div className="sheet-panel" role="dialog" aria-label="Add a dish">` — `position: fixed; bottom: 0; left: 0; right: 0; height: 70vh; border-radius: 16px 16px 0 0; background: var(--surface); z-index: 101`
- Drag handle at top: `<div className="sheet-handle">` — `width: 40px; height: 4px; border-radius: 2px; background: var(--border); margin: 10px auto;`
- LibraryBrowser rendered inside sheet; `onSelect` closes sheet and appends recipeId to `dishes`
- Keyboard: `Escape` closes sheet; focus trapped within sheet while open
- Animation: `transform: translateY(0)` when open, `transform: translateY(100%)` when closed; `transition: transform 250ms ease`
- Already-added dishes: `excludeIds` passed to LibraryBrowser; those cards render with `opacity: 0.5; pointer-events: none` and a checkmark badge

### AddDishButton

- `<button className="add-dish-btn">` — outline style, full-width, `border: 1.5px dashed var(--border)`
- Label: `+ Add dish`
- On tap: `setPickerOpen(true)`
- Renders between DishLimitWarning and NutritionStrip in DOM order

### Handler: addDish

```typescript
function addDish(recipeId: string) {
  setPickerOpen(false)
  setDishes(prev => [...prev, recipeId])
  setTiers(prev => ({ ...prev, [recipeId]: 'standard' }))       // default tier
  setServings(prev => ({ ...prev, [recipeId]: 2 }))              // default servings
  if (dishes.length + 1 >= 7) setShowLimitWarning(true)
}
```

### Handler: removeDish

```typescript
function removeDish(recipeId: string) {
  setDishes(prev => prev.filter(id => id !== recipeId))
  setTiers(prev => { const n = { ...prev }; delete n[recipeId]; return n })
  setServings(prev => { const n = { ...prev }; delete n[recipeId]; return n })
  // showLimitWarning auto-clears via useEffect watching dishes.length
}
```

### resolveRecipe helper

```typescript
function resolveRecipe(
  id: string,
  tier: Tier,
  servings: number,
  allRecipes: RecipeGraph[]
): RecipeGraph {
  // Find recipe by id+tier in allRecipes (server catalog + personal library)
  // Clone and apply servings override: scale node ingredient quantities
  // Returns the RecipeGraph ready to pass to compile()
}
```

`allRecipes` is the merged array from `useRecipeLibrary()` hook (IndexedDB personal + Supabase server catalog, already loaded before HomeScreen renders).

---

## Data & Dependencies

### Data sources

| Data | Source | How accessed |
|---|---|---|
| All recipes (server catalog) | Supabase via `/api/library/*` | `useRecipeLibrary()` hook, cached in component above HomeScreen |
| Personal library | IndexedDB `recipeStore` | `useRecipeLibrary()` hook, same cache |
| Kitchen equipment | localStorage `tutti.kitchen` | `useKitchen()` hook — passed to `compile()` |
| Serve time | Local state `serveAt` | Initialized to `null`; persisted to sessionStorage so refresh during planning doesn't lose it |
| Nutrition data | `RecipeGraph.nutrition` field (engine type) | Aggregated inline in NutritionStrip |
| Ingredient color | `kindColorOf(name)` from `ingredientColor.tsx` | Called per DishCard render |

### compile() call

```typescript
import { compile } from '@tutti/engine'

const plan: MasterExecutionPlan = compile(
  selectedRecipes,       // RecipeGraph[] with servings applied
  kitchen,               // KitchenConfig from useKitchen()
  resolvedServeTime      // "HH:MM" string — serveAt ?? currentTime()
)
```

`compile()` is synchronous and fast (< 5ms for 6 recipes on a low-end device). No loading spinner is needed. If `compile()` throws (malformed recipe graph), catch the error and show an inline error message above the BuildPlanButton: "Couldn't build a plan — one of your recipes may be incomplete."

### Screen transitions

| Trigger | Destination | Payload |
|---|---|---|
| Build Plan tapped (success) | `preview` | `{ plan: MasterExecutionPlan, recipes: RecipeGraph[] }` |
| Dish card tapped (name area) | `recipe` | `{ recipeId, prevScreen: 'home' }` — read-only view |
| Back from recipe | `home` | — uses `prevScreen` tracking already in App.tsx |

### Components shared with other screens

- `LibraryBrowser` — also used by Studio (Browse-in-Studio context); the `onSelect` callback pattern is new, current Studio usage navigates away
- `NutritionStrip` — currently home-screen-only; may be reused on Preview screen in a future phase
- `DishCard` — home-screen-only; Preview screen shows a read-only version of the dish list (no tier/servings editing after plan is compiled)
- `kindColorOf` / `ingredientColor.tsx` — also used in Cook screen step panels and ingredient legend

### What must not change

- `compile()` signature and return type — engine is stable; HomeScreen is a consumer only
- `RecipeGraph` type — fields are read, not written, on this screen
- `useRecipeLibrary()` loading behavior — HomeScreen assumes recipes are already available when it renders; loading state is handled by the parent shell
