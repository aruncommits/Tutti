# 19 — Meals Screen V2

## Overview

The Meals screen is Tutti's personal cook history — a chronological log of every session the user has completed. It lives inside the "Me" tab in V2 (alongside Calendar and Settings), giving it a reflective, personal-archive character rather than an action-first one. Its core jobs are: let users see what they have cooked and when, resurface a past meal plan with one tap ("Cook again"), and surface ratings and notes they left during cook sessions. It is not a social feed and not a recommendation engine — it is a quiet ledger that rewards cooking with a record.

## Current State

`apps/web/src/screens/MealsScreen.tsx` renders a flat list of `SavedMeal` objects read from `usePersistentState("tutti.meals")`. Each card displays the dish names (resolved from `recipeIds` against the personal library), a formatted `cookedAt` date, and per-recipe star ratings when present. There is no photo display, no filtering, no "Cook again" action, no delete gesture, and no note preview. The screen is reachable from the current bottom nav as a standalone tab. The `SavedMeal` type lives in `packages/engine/src/types.ts` and currently carries `{ id, recipeIds, cookedAt: number, ratings: Record<string, number> }` — the `notes` and `photos` fields referenced in V2 exist in adjacent data structures but are not yet part of `SavedMeal`.

## Problem

From a real user's perspective:

1. **History is a dead end.** Tapping a past meal shows dish names and a date — and nothing else happens. There is no way to cook that combination again without manually reassembling it on Home.
2. **No visual identity.** Every card looks identical — plain text, no color, no thumbnail — making it impossible to scan for a specific meal by memory ("the one with butter chicken and dal").
3. **No filtering.** After 20+ meals the list is overwhelming to scroll. There is no way to find last month's meals or only the meals the user rated highly.
4. **Notes are stranded.** Users can add notes during cook mode, but those notes are invisible on the history screen — they are written and then effectively lost.
5. **No way to remove clutter.** Test cooks, accidental saves, or meals the user wants to forget cannot be deleted.
6. **Empty state gives no guidance.** A blank screen on first use offers no explanation of what this space is for or how to fill it.

## V2 Design

The screen moves to the "Me" tab and is titled **"Your cook history"** — personal, second-person, past-tense framing that matches its reflective purpose.

**Cards become scannable.** Dish names render as color chips (using `kindColorOf` color logic consistent with the rest of the app), so a meal with "Butter Chicken + Dal Tadka + Rice" is instantly recognisable by its color pattern, not just its text. If any `photos[recipeId]` thumbnail exists it appears as a small square on the leading edge of the card.

**"Cook again" closes the loop.** The most important new action: one tap loads the meal's `recipeIds` back into the home plan state and navigates to the Cook tab (Home screen) with those dishes pre-selected and serve time cleared for the user to set. This turns the history log into a practical replay tool.

**Filters stay simple.** Three chip options — All / This month / Highly rated (4★+) — cover the realistic use cases without building a full search system. Chips sit in a horizontally scrollable row below the header.

**Notes surface inline.** If any recipe in the meal has a recorded note, one note (the first non-empty one) is shown below the dish chips in italic, truncated to two lines. This makes note-taking feel worthwhile.

**Delete is non-destructive in UI.** Swipe-left on a card (or ⋮ overflow menu on desktop/no-swipe contexts) reveals a "Delete this record" action with a brief confirmation snackbar ("Meal removed — Undo"). Undo restores within 5 seconds. After that the entry is removed from `savedMeals`.

**Empty state is actionable.** "No meals yet — cook something and it'll appear here!" with a single "Browse recipes" button that navigates to the Browse tab.

The sort order is always most-recent-first; no user control needed at this scale.

## Spec

### Component tree

```
MealsScreen
├── MealsHeader                    // "Your cook history" h1 + meal count badge
├── MealsFilterBar                 // chip row: All | This month | Highly rated
├── MealsList                      // scrollable list or EmptyMeals
│   ├── MealCard (×n)
│   │   ├── MealCardPhoto          // thumbnail if photos[recipeId] exists
│   │   ├── MealCardDate           // "Tuesday, June 17" formatted
│   │   ├── MealCardDishes         // color chips row
│   │   ├── MealCardRatings        // star display (avg or per-dish)
│   │   ├── MealCardNote           // italic note preview, 2-line clamp
│   │   └── MealCardActions        // "Cook again" button + ⋮ menu
│   └── EmptyMeals                 // empty state
└── DeleteSnackbar                 // undo toast, z-index above nav
```

### Types

Extend `SavedMeal` in `packages/engine/src/types.ts`:

```ts
export interface SavedMeal {
  id: string;
  recipeIds: string[];
  cookedAt: number;                          // Unix ms timestamp
  ratings: Record<string, number>;          // recipeId → 1–5
  notes?: Record<string, string>;           // recipeId → freeform text
  photos?: Record<string, string>;          // recipeId → data-URL or blob URL
}
```

### State (MealsScreen.tsx)

```ts
const [savedMeals, setSavedMeals] = usePersistentState<SavedMeal[]>("tutti.meals", []);
const [filter, setFilter] = useState<"all" | "month" | "rated">("all");
const [pendingDelete, setPendingDelete] = useState<SavedMeal | null>(null);
const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

### Derived data

```ts
const now = Date.now();
const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

const filtered = useMemo(() => {
  let list = [...savedMeals].sort((a, b) => b.cookedAt - a.cookedAt);
  if (filter === "month") list = list.filter(m => m.cookedAt >= startOfMonth);
  if (filter === "rated") list = list.filter(m => {
    const ratings = Object.values(m.ratings ?? {});
    return ratings.length > 0 && (ratings.reduce((s, r) => s + r, 0) / ratings.length) >= 4;
  });
  return list;
}, [savedMeals, filter, startOfMonth]);
```

### Date formatting

```ts
// MealCardDate
function formatCookDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
```

### "Cook again" handler

```ts
function handleCookAgain(meal: SavedMeal) {
  // 1. Resolve recipeIds to full RecipeGraph objects from personal library
  const recipes = meal.recipeIds
    .map(id => allRecipes.find(r => r.recipeId === id))
    .filter(Boolean) as RecipeGraph[];

  // 2. Set home plan state (lifted to App or via context)
  setSelectedRecipes(recipes);
  setServeTime(null);       // user re-sets serve time

  // 3. Navigate to Cook tab → Home screen
  setScreen("home");
}
```

`allRecipes` = merged personal library (IndexedDB `recipeStore`) + catalog cache. If any `recipeId` is no longer resolvable (deleted from library), it is silently skipped; if all are missing a toast explains "Some recipes are no longer in your library."

### Delete flow

```ts
function handleDeleteRequest(meal: SavedMeal) {
  // Optimistically remove from list
  setSavedMeals(prev => prev.filter(m => m.id !== meal.id));
  setPendingDelete(meal);
  if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  undoTimerRef.current = setTimeout(() => {
    setPendingDelete(null);
  }, 5000);
}

function handleUndo() {
  if (!pendingDelete) return;
  setSavedMeals(prev => [...prev, pendingDelete].sort((a, b) => b.cookedAt - a.cookedAt));
  setPendingDelete(null);
  if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
}
```

Swipe gesture: wrap `MealCard` in a `SwipeableRow` component (thin wrapper — `touchstart`/`touchmove`/`touchend` with 60 px threshold). On threshold crossed, reveal red "Delete" stripe. On release beyond 120 px, call `handleDeleteRequest`. On desktop, expose ⋮ button → dropdown with "Delete this record" option.

### Note preview

```ts
// First non-empty note across recipeIds in the meal
const firstNote = meal.recipeIds
  .map(id => meal.notes?.[id])
  .find(n => n && n.trim().length > 0);
```

Render as `<p className="meal-card__note">"{firstNote}"</p>` with CSS `-webkit-line-clamp: 2`.

### MealCardDishes

Dish name chips reuse the ingredient color token system. Each chip:

```tsx
<span
  className="meal-chip"
  style={{ background: kindColorOf(dishName) + "22", color: kindColorOf(dishName) }}
>
  {dishName}
</span>
```

Chips wrap; overflow (>4 chips) collapses to "+N more" inline.

### Photo thumbnail

`meal.photos?.[meal.recipeIds[0]]` — use only the first recipe's photo as the card thumbnail. Render as a 48 × 48 px rounded square (`border-radius: 8px`, `object-fit: cover`). If no photo, the slot is absent (no placeholder silhouette — cleaner).

### Filters

```tsx
type MealsFilter = "all" | "month" | "rated";

const FILTER_LABELS: Record<MealsFilter, string> = {
  all:   "All",
  month: "This month",
  rated: "Highly rated (4★+)",
};
```

Chips rendered as `<button role="radio" aria-checked={filter === f}>`. Active chip: filled `--color-primary` background, white text. Inactive: bordered, muted text.

### Empty state

```tsx
function EmptyMeals({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="meals-empty">
      <p>No meals yet — cook something and it'll appear here!</p>
      <button className="btn btn--primary" onClick={onBrowse}>
        Browse recipes
      </button>
    </div>
  );
}
```

`onBrowse` → `setScreen("browse")`.

When a filter is active and returns zero results, show: "No meals match this filter." with a "Clear filter" link — does not show the Browse button.

### CSS classes (new, in `MealsScreen.css`)

```
.meals-screen
.meals-header
.meals-filter-bar
.meals-filter-chip               // base chip
.meals-filter-chip--active
.meals-list
.meal-card
.meal-card--swiping              // JS-toggled during swipe
.meal-card__photo
.meal-card__date
.meal-card__dishes
.meal-chip
.meal-card__ratings
.meal-card__note
.meal-card__actions
.meal-card__cook-again
.meal-card__overflow-menu
.meals-empty
.delete-snackbar
.delete-snackbar__undo
```

### Accessibility

- Each `MealCard` is a `<article>` with `aria-label="Meal cooked on {formattedDate}"`.
- "Cook again" button has `aria-label="Cook {dishNames} again"`.
- `DeleteSnackbar` uses `role="status"` so screen readers announce the undo option.
- Filter chips use `role="radiogroup"` + `role="radio"` pattern.

## Data & Dependencies

**Reads:**
- `usePersistentState("tutti.meals")` → `SavedMeal[]` — source of truth for all history entries.
- `recipeStore` (IndexedDB) + catalog cache → resolves `recipeIds` to names and `kindColorOf` inputs for dish chips.
- `SavedMeal.photos` → data-URL or blob URL for thumbnails (written during cook session, if photo feature is active).
- `SavedMeal.notes` → written by cook screen note-taking UI.

**Writes:**
- `setSavedMeals(filtered)` on delete confirmation.

**Navigates to:**
- `"home"` (Cook tab) via "Cook again" — also sets `selectedRecipes` context and clears `serveTime`.
- `"browse"` via empty-state Browse button.

**Touched by other screens:**
- `CookScreen` — appends to `savedMeals` when a session completes (writes `cookedAt`, `ratings`, `notes`, `photos`).
- `HomeScreen` — reads `selectedRecipes` state that "Cook again" populates.
- `MeTab` container — hosts MealsScreen alongside CalendarScreen and SettingsScreen; passes `setScreen` and `allRecipes` as props.

**Engine types:**
- `SavedMeal` — `packages/engine/src/types.ts` (needs `notes` and `photos` fields added).
- `RecipeGraph` — `packages/engine/src/types.ts` — used for "Cook again" recipe resolution.

**Shared utilities:**
- `kindColorOf(name)` from `apps/web/src/utils/ingredientColor.tsx` — dish chip colors.
- `formatCookDate(ts)` — new local util in `MealsScreen.tsx` (or `utils/dateFormat.ts` if shared with Calendar).
- `SwipeableRow` — new shared component in `apps/web/src/components/SwipeableRow.tsx`; also useful for future swipe-to-delete patterns elsewhere.
