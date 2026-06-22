# 05 — Home Screen: Empty State

## Overview

The Home screen is the primary action surface of Tutti — it is where a user assembles a meal by picking dishes, sets a target serve time, and kicks off the parallel cook planner. The empty state (no dishes selected) is the first thing a returning user sees on every session. It must answer one question immediately: "What do I cook tonight?" — then get out of the way. The current empty state buries the primary action and collapses critical controls, creating friction before the user has done anything.

## Current State

File: `apps/web/src/screens/HomeScreen.tsx`

- When `dishes === []`, renders the text "No dishes yet. Add a dish to get started." as a static paragraph with no visual weight.
- CTA buttons (Paste recipe, Ask AI, Browse) exist in the component but share a generic button row that does not visually rank them — all buttons appear equal, no single obvious next step.
- Serve time control is hidden behind a collapsed "Set serve time" text link. The chip with the actual time value only appears after the user explicitly taps to expand it. New users frequently miss it entirely and tap "Build Plan" with no serve time set, hitting a validation error.
- The dish list area renders as empty whitespace — no affordance indicating that dishes belong there.
- No discovery surface: once a user lands on this screen with no dishes, the app gives them nothing to react to; they must navigate away (Browse) to find something to cook.
- `Build Plan` button is always visible regardless of dish count, which means it can be tapped on an empty state, producing an error.

## Problem

From a real user's perspective on session two or later:

1. **No clear first move.** The screen looks empty and passive. "No dishes yet" is a confirmation of an obvious state, not an invitation to act.
2. **Serve time is hidden.** Users who go straight to adding dishes never set a serve time because the control is collapsed. They only discover this when Build Plan fails. The serve time is not optional — surfacing it by default avoids a dead-end error.
3. **All CTAs have equal weight.** Paste, Ask AI, Browse, Import are shown as siblings. Browse is by far the most common path for new-to-moderate users, but it gets the same visual treatment as niche actions (Import menu, Ask AI).
4. **Dead zone below the header.** There is no content below the empty message until the user has already added something. The screen offers no reason to stay — it sends users to Browse, which means a navigation round-trip to accomplish what the Home screen should initiate.
5. **Build Plan is always tappable.** An empty-state "Build Plan" button that immediately errors erodes trust.

## V2 Design

The empty state becomes an active, opinionated surface that:

- Immediately surfaces one primary action (Browse) with unmistakable visual weight.
- Shows serve time by default — no tap required to reveal it. The chip is readable, not a link.
- Fills the dish area with a placeholder card so the layout is not a blank void.
- Offers three suggested recipes in a horizontal scroll below the placeholder — reducing round-trips to Browse for a user who just wants to cook *something* good tonight.
- Removes Build Plan from the empty state entirely; it appears only once at least one dish is added.

The reasoning behind each choice:

- **Browse as primary CTA**: Browse is the canonical discovery path. Making it the single dominant button on an empty Home surfaces the correct mental model: Browse → pick → cook. Secondary actions (Paste, Ask AI, Import menu) are real but less frequent; they become chips, not buttons.
- **Serve time visible by default**: Serve time is load-bearing. If it is set before a user adds dishes, every dish they add is immediately slotted against a real deadline. Hiding it until post-add inverts the natural planning order.
- **Suggestions row**: Three random-from-library recipes with an inline "+ Add" give the user a one-tap path to their first dish without leaving the screen. They refresh each session so the screen feels alive rather than static.
- **Placeholder card with dashed border**: A 120px placeholder with copy "Your dishes appear here" occupies the layout slot that dish cards will fill. It teaches the layout before content arrives and prevents the jarring reflow when the first card is added.
- **Build Plan deferred**: Showing a disabled or hidden Build Plan on empty state removes a source of user error. The button earns its appearance by waiting for at least one dish.

## Spec

### Layout (top-to-bottom, empty state only)

```
[Title: "Tonight's cook"]
[Serve time chip]                     ← always visible
[Primary CTA: "Browse recipes"]       ← full-width, big-btn
[Secondary chip row]                  ← Paste a recipe | Ask AI | Import menu
[Subtext]                             ← "or drag a recipe from your library below"
[Placeholder dish card]               ← dashed border, 120px
[Suggestions row]                     ← horizontal scroll, 3 cards
```

### Components

**`<ServeTimeChip />`** (refactored from inline link)

- Props: `time: Date | null`, `onChange: (date: Date) => void`
- Default time: today at 7:00 PM (local time) — not `null`; the chip always has a value on first render
- Display: `"Ready at {hh:mm AM/PM} · tap to change"`
- On tap: opens `<TimePickerModal />` (existing modal, no change to implementation)
- CSS class: `serve-time-chip` — pill shape, `background: var(--color-surface-raised)`, border `1px solid var(--color-border)`, `font-size: 0.85rem`
- Do not collapse this component when `dishes.length === 0`

**`<PrimaryActionRow />`** (new component, renders only when `dishes.length === 0`)

- "Browse recipes" button: `<button className="btn big-btn full-width">Browse recipes</button>` — navigates to Browse screen
- Secondary chip row: `<div className="secondary-chip-row">` containing three `<button className="action-chip">` elements:
  - "Paste a recipe" → opens existing PasteRecipeModal
  - "Ask AI" → opens existing AskAIModal
  - "Import menu" → navigates to menuImport screen
- Subtext: `<p className="action-hint">or drag a recipe from your library below</p>` — `font-size: 0.78rem`, `color: var(--color-text-muted)`, centered, margin-top 6px

**`<DishPlaceholderCard />`** (new component, renders only when `dishes.length === 0`)

- CSS: `border: 2px dashed var(--color-border)`, `border-radius: var(--radius-card)`, `height: 120px`, `display: flex`, `align-items: center`, `justify-content: center`
- Inner copy: `"Your dishes appear here"` — `color: var(--color-text-muted)`, `font-size: 0.9rem`
- No interactivity — purely structural

**`<SuggestionsRow />`** (new component, renders only when `dishes.length === 0`)

- Data: on component mount, selects 3 recipes at random from the local engine library (IndexedDB `recipeStore` or the in-memory catalog already loaded by Browse) — seed is `sessionStorage.setItem('suggestSeed', Date.now())` so it is stable for the session but refreshes on new sessions
- Layout: `<div className="suggestions-row">` with `overflow-x: auto`, `display: flex`, `gap: 12px`, `padding: 0 4px 8px`
- Each suggestion card: `<div className="suggestion-card">` — `min-width: 160px`, `border-radius: var(--radius-card)`, `background: var(--color-surface-raised)`, `padding: 12px`
  - Dish name: `<p className="suggestion-name">` — `font-weight: 600`, single line, ellipsis overflow
  - Cuisine chip: `<span className="cuisine-chip">` — same chip style used in Browse
  - "+ Add" button: `<button className="btn small-btn">+ Add</button>` — calls `addDish(recipe)` on the HomeScreen state, which triggers the normal dish-add flow (no modal required for suggestions — add directly)
- Accessibility: `role="list"` on the row, `role="listitem"` on each card

**`<BuildPlanButton />`** (existing, behaviorally changed)

- Render condition: `dishes.length > 0` only — do not render in empty state
- Disabled state: `disabled` when `dishes.length > 0 && serveTime === null` — edge case if user somehow clears the chip value
- When `serveTime` is null and user taps: inline error below the button: `"Set a serve time above to build your plan"` — but this should be rare given serve time now defaults to 7:00 PM

### State changes in `HomeScreen.tsx`

```ts
// existing
const [dishes, setDishes] = useState<RecipeGraph[]>([]);

// new default — serve time no longer null on mount
const [serveTime, setServeTime] = useState<Date>(() => {
  const d = new Date();
  d.setHours(19, 0, 0, 0);   // 7:00 PM today
  return d;
});
```

- `addDish(recipe: RecipeGraph)`: existing function, no change — adding first dish causes `dishes.length` to flip from 0 to 1, which via conditional rendering removes `<PrimaryActionRow />`, `<DishPlaceholderCard />`, and `<SuggestionsRow />` and shows dish cards + `<BuildPlanButton />`

### CSS classes (additions to `HomeScreen.css` or global component stylesheet)

| Class | Purpose |
|---|---|
| `serve-time-chip` | Pill chip for serve time display |
| `secondary-chip-row` | Flex row for the three secondary action chips |
| `action-chip` | Pill-shaped secondary action button |
| `action-hint` | Muted subtext below secondary chips |
| `suggestion-card` | Individual recipe suggestion card |
| `suggestions-row` | Horizontal scroll container for suggestions |

### Transitions

- **Adding first dish**: `dishes.length` goes 0 → 1. `PrimaryActionRow`, `DishPlaceholderCard`, and `SuggestionsRow` unmount. First `DishCard` mounts in their place. `BuildPlanButton` mounts at the bottom.
- **Removing last dish**: `dishes.length` goes 1 → 0. Reverses the above. Suggestions row re-renders (same session seed → same three suggestions).
- No animation required for V2 (can be added as a polish pass — CSS `transition: opacity 150ms ease` on the placeholder group is a low-effort addition if desired).

### Edge cases

- **Library not yet loaded**: `SuggestionsRow` shows three skeleton cards (`<div className="suggestion-card skeleton" />`) while the library query resolves. If the library is empty (first install, no network), hide the suggestions row entirely rather than showing an error.
- **All three suggestions already in dishes**: Replace used suggestions with next random picks from the same shuffled pool rather than showing duplicates. The pool is the full catalog minus dishes already in `dishes`.
- **Serve time in the past**: If the defaulted 7:00 PM is earlier than `Date.now()` (user opens the app after 7 PM), advance the default to tomorrow at 7:00 PM. Logic in the `useState` initializer.
- **"Import menu" chip**: Only render this chip if the `menuImport` feature flag is enabled (currently always true — kept as a conditional for future flag control).
- **Touch vs. mouse**: The suggestions row must be touch-scrollable on mobile (the default `overflow-x: auto` handles this) and should not show a scrollbar on desktop (add `scrollbar-width: none` / `::-webkit-scrollbar { display: none }` to `.suggestions-row`).

## Data & Dependencies

| Dependency | Detail |
|---|---|
| `RecipeGraph[]` from IndexedDB `recipeStore` | Used to populate `SuggestionsRow`. Already fetched by Browse; Home should read from the same cached result rather than issuing a second query. Pass via context or a shared `useLibrary()` hook. |
| `sessionStorage` key `suggestSeed` | Written once per session on `SuggestionsRow` mount; read to re-use the same shuffle. |
| `ServeTimeChip` → `TimePickerModal` | Time picker modal must already exist (it does, used in calendar); import directly. |
| `PasteRecipeModal`, `AskAIModal` | Already exist as modals triggered from Studio; re-use them unchanged — Home just calls `setModal('paste')` / `setModal('askAI')`. |
| `menuImport` screen | Navigation via existing `setScreen('menuImport')` call in `App.tsx`. |
| Browse screen | "Browse recipes" button calls `setScreen('browse')` — no new navigation mechanism needed. |
| `addDish()` in `HomeScreen.tsx` | Called by each suggestion card's "+ Add" button. Same function used for all other add-dish paths. |
| `BuildPlanButton` → `compile()` engine call | No change to compile path; button just gains a render condition. |
| Screens that open recipe detail from Home | `prevScreen` tracking already fixed in `App.tsx` (see V2 decisions); back from recipe returns to Home correctly. |
