# 07 — Home Screen: Library Picker

## Overview

The Library Picker is a bottom-sheet overlay that lets users add recipes to their active meal plan without leaving the Home screen. It replaces the previous inline LibraryBrowser component, which required navigating away or occupying permanent screen real estate. The picker surfaces both the user's personal library and the server-backed 600-recipe catalog in a single unified interface, with search and category filtering, so a user can go from "I want to cook something" to "dish added to my plan" in under 10 seconds without losing their current plan context.

---

## Current State

**Component:** `apps/web/src/components/LibraryBrowser.tsx` (used inline inside `HomeScreen`)

**What exists today:**
- Category chip row rendered as a scrollable horizontal list, populated from a static or server-fetched category list
- Dish cards fetched from `/api/library/search` (proxied through Vite dev server; no direct Supabase calls from browser)
- Search input field — not auto-focused; sits above the chip row
- Pagination implemented via a "Load more" button; no IntersectionObserver sentinel
- "Add" button on each card calls `addCandidate(recipeId)` then triggers a navigate to preview or home depending on call site
- Personal recipes from `localStorage tutti.candidates` and IndexedDB `recipeStore` rendered in the same grid, interleaved with server results
- No distinction between personal and server recipes in the card layout
- No "View" / preview path from this component — tapping a card adds it immediately
- No offline detection or offline-specific messaging
- No empty-state handling for zero search results
- Component is mounted as a full section of the Home screen DOM, always visible when the "Add dish" area is expanded

**Relevant files:**
- `apps/web/src/components/LibraryBrowser.tsx`
- `apps/web/src/screens/HomeScreen.tsx`
- `apps/web/src/lib/library.ts` — `searchDishes()`, `getRecipe()`
- `apps/web/src/lib/candidates.ts` — `addCandidate()`, `listCandidates()`
- `packages/engine/src/types.ts` — `RecipeGraph`, `DishSummary`

**What is broken or missing:**
- Picker occupies permanent vertical space; scrolling the plan and scrolling the picker conflict
- No auto-focus on search; user must tap the field manually
- Personal and server recipes are visually indistinguishable
- "Add" closes the browser inconsistently depending on where LibraryBrowser is mounted
- No preview-without-adding path
- Pagination requires an explicit button tap, creating friction on long lists
- Offline state shows a generic fetch error, not a user-readable fallback

---

## Problem

From a real user's perspective:

1. **Context loss.** The current inline browser pushes the meal plan cards off screen the moment it expands. The user loses sight of what they have already added while trying to decide what to add next.

2. **No preview before commitment.** Tapping a card immediately adds the dish. If the user wants to check the ingredients or estimated time, they must add it, navigate to the recipe screen, decide they do not want it, then remove it — four steps for what should be a passive browse action.

3. **Personal recipes buried.** A user's own Studio recipes appear somewhere in the interleaved grid, with no visual priority. A user who just created a recipe in Studio cannot reliably find it here.

4. **Search friction.** The search field is not focused when the browser opens, so mobile keyboard does not appear automatically. Users who arrive with a specific dish in mind must tap to focus before typing.

5. **Pagination dead-end.** The "Load more" button sits below a potentially long card grid. On mobile, reaching it requires deliberate scrolling. Many users do not scroll far enough to discover it.

6. **Offline silence.** When the server is unreachable, the grid goes empty with a network error. The user does not know whether the app is broken or they are offline, and they do not know that their personal recipes are still available.

7. **Search zero-state.** A failed search returns an empty grid with no guidance. There is no path from "I searched for something and got nothing" to "I can request it."

---

## V2 Design

**Bottom sheet instead of inline expansion.** The picker slides up to 75% of viewport height, overlaying the plan without replacing it. A dimmed backdrop keeps the plan partially visible. The user can see what they are building and the picker simultaneously, then dismiss by tapping the backdrop or dragging the sheet down.

**Auto-focused search.** The search field receives focus as soon as the sheet finishes its open animation (after ~250 ms). On mobile this triggers the keyboard immediately, matching the mental model: open picker → type what you want.

**Two explicit sections: My Recipes first, then All Recipes.** Personal library items (candidates from localStorage + IndexedDB) appear in a horizontal scroll row at the top of the sheet, above the category chips and server grid. This section is always available offline. The "All Recipes" section below it is the paginated server catalog. The separation makes personal recipes findable without burying them in a sort algorithm.

**Add closes the sheet; View opens a modal.** Each card has two distinct actions: a primary "+ Add" that calls `onAddRecipeId` and closes the sheet, and a secondary "View" link that opens a lightweight recipe preview modal (not a full-screen navigate). This preserves the browse context: the sheet stays behind the modal, and closing the modal returns to the sheet.

**Infinite scroll via IntersectionObserver.** A sentinel `<div>` sits below the last card row. When it enters the viewport, the next page is fetched and appended. No visible button is needed; the list simply grows as the user scrolls.

**Offline banner + My Recipes fallback.** On mount, and on each server fetch failure, the picker checks `navigator.onLine` and catches network errors. If offline, a non-blocking banner replaces the "All Recipes" grid: "You're offline — showing your saved recipes." The My Recipes row continues to function normally.

**Search zero-state → Ask AI.** When `searchDishes()` returns an empty array for a non-empty query, the grid is replaced by: "No matches — try Ask AI" with a button that dismisses the picker and opens the AI prompt pre-filled with the search text. This converts a dead-end into an actionable path.

**No navigation.** The picker never triggers a `navigate()` call. Adding a recipe, viewing a recipe, and dismissing the picker all operate within the overlay layer. The Home screen's `navigate` path is only used if the user explicitly taps a full recipe link from within the preview modal.

---

## Spec

### Component tree

```
LibraryPickerSheet                     ← new, replaces inline LibraryBrowser
  PickerBackdrop                       ← semi-transparent overlay, tap to close
  PickerSheet                          ← slides up, 75vh, drag handle at top
    DragHandle
    PickerSearchBar                    ← auto-focused input + clear button
    MyRecipesRow                       ← horizontal scroll, personal library only
      RecipeChip[]                     ← compact pill cards
    CategoryChipRow                    ← horizontal scroll, category filter
    AllRecipesGrid                     ← paginated server results
      DishCard[]
        DishColorSwatch
        DishName
        CuisineBadge
        TimeBadge
        AddButton                      ← primary
        ViewButton                     ← secondary
      SentinelDiv                      ← IntersectionObserver target
    OfflineBanner                      ← conditional
    SearchEmptyState                   ← conditional
  RecipePreviewModal                   ← existing modal, re-used; not a new screen
```

### Props

```typescript
interface LibraryPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecipeId: (recipeId: string) => void;  // App.tsx pickLibraryRecipe handler
  onOpenAiPrompt?: (prefill: string) => void; // Search zero-state CTA
}
```

### State (internal to `LibraryPickerSheet`)

| State field | Type | Initial | Notes |
|---|---|---|---|
| `query` | `string` | `""` | Controlled search input |
| `activeCategory` | `string \| null` | `null` | Selected chip; null = all |
| `page` | `number` | `0` | Current pagination page |
| `serverResults` | `DishSummary[]` | `[]` | Accumulated across pages |
| `hasMore` | `boolean` | `true` | False when last page < pageSize |
| `isLoadingServer` | `boolean` | `false` | Spinner in All Recipes section |
| `isOffline` | `boolean` | `false` | Derived from navigator.onLine + fetch error |
| `previewRecipeId` | `string \| null` | `null` | Opens RecipePreviewModal |
| `myRecipes` | `RecipeSummary[]` | `[]` | From listCandidates() on open |

### Sheet open/close animation

- CSS class `picker-sheet` with `transform: translateY(100%)` default
- Class `picker-sheet--open` sets `transform: translateY(0)` with `transition: transform 250ms cubic-bezier(0.32, 0.72, 0, 1)`
- Backdrop: `opacity: 0` → `opacity: 1` over 250 ms
- Search field focus fires in `useEffect` after 260 ms (`setTimeout` of 260 — just after animation completes) using `searchRef.current?.focus()`
- Drag-to-dismiss: `onPointerDown` + `onPointerMove` tracks delta Y; if released with velocity > 300 px/s or displacement > 40% of sheet height, calls `onClose()`

### My Recipes row

- Populated by `listCandidates()` (returns `Candidate[]` from localStorage + IndexedDB) on every picker open (not cached across opens)
- Renders as `<div class="my-recipes-row">` with `overflow-x: auto; display: flex; gap: 8px`
- Each item: `<button class="recipe-chip">` — 120 px wide, shows dish name + color swatch, full-bleed "+ Add" tap
- "My Recipes" section heading shown only when `myRecipes.length > 0`; no empty state for this row (section hidden when empty)
- Tapping a chip calls `onAddRecipeId(recipeId)` then `onClose()`
- No "View" button on chips (space too tight); chip tap = add only

### Category chip row

- Fetched from `/api/library/categories` on first open, then cached in module-level variable for session
- Renders `<div class="category-chips">` with `overflow-x: auto`
- "All" chip always first; selecting a chip resets `page` to 0 and clears `serverResults`
- Active chip: `class="chip chip--active"` (filled background, theme-aware via `data-theme`)

### All Recipes grid

- Calls `library.searchDishes({ q: query, category: activeCategory ?? undefined, pageSize: 20, page })` 
- Results appended to `serverResults` (not replaced) on page > 0; replaced on page = 0 (new search/category)
- Debounced: query changes trigger a 300 ms debounce before fetch; `page` resets to 0 on query/category change
- Grid layout: `display: grid; grid-template-columns: 1fr; gap: 12px` (single column on mobile; two columns ≥ 480 px)

### DishCard layout

```
[color swatch 4px left border, full card height]
[name — 1 line, truncated]
[cuisine badge] [time badge]           ← second row
[         View         ] [ + Add ]     ← third row, full width split
```

- Color swatch: `kindColorOf(dish.primaryIngredient)` from `ingredientColor.tsx`; rendered as `border-left: 4px solid <color>`
- Cuisine badge: `<span class="badge badge--cuisine">` — value from `DishSummary.cuisine`
- Time badge: `<span class="badge badge--time">` — computed as sum of `DishSummary.estimatedMinutes`; format `"~{n} min"`; if `estimatedMinutes` is null, omit badge
- "View" button: `variant="ghost"`, calls `setPreviewRecipeId(dish.recipeId)`
- "+ Add" button: `variant="primary"`, calls `onAddRecipeId(dish.recipeId)` then `onClose()`
- Loading skeleton: same grid dimensions, `class="dish-card dish-card--skeleton"` with CSS shimmer animation

### Sentinel + IntersectionObserver

```typescript
const sentinelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!sentinelRef.current || !hasMore || isLoadingServer) return;
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) setPage(p => p + 1); },
    { threshold: 0.1 }
  );
  observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, [hasMore, isLoadingServer, serverResults.length]);
```

Sentinel is `<div ref={sentinelRef} style={{ height: 1 }} />` placed after the last card.

### Offline detection

```typescript
useEffect(() => {
  const goOffline = () => setIsOffline(true);
  const goOnline  = () => { setIsOffline(false); setPage(0); };
  window.addEventListener('offline', goOffline);
  window.addEventListener('online',  goOnline);
  setIsOffline(!navigator.onLine);
  return () => {
    window.removeEventListener('offline', goOffline);
    window.removeEventListener('online',  goOnline);
  };
}, []);
```

If `searchDishes()` throws a network error while `navigator.onLine` is true, set `isOffline(true)` and show the same banner (transient connectivity loss).

**Offline banner markup:**
```html
<div class="offline-banner" role="status">
  You're offline — showing your saved recipes
</div>
```
Banner replaces the All Recipes grid; My Recipes row remains visible.

### Search empty state

Condition: `query.length > 0 && serverResults.length === 0 && !isLoadingServer && !isOffline`

```html
<div class="search-empty-state">
  <p>No matches for "<strong>{query}</strong>"</p>
  <button class="btn btn--primary" onClick={() => {
    onClose();
    onOpenAiPrompt?.(query);
  }}>
    Try Ask AI
  </button>
</div>
```

`onOpenAiPrompt` is wired in `HomeScreen` to open the AI chat input pre-filled with `query`. If `onOpenAiPrompt` is not provided, the button is not rendered (graceful degradation).

### RecipePreviewModal

- Reuses the existing preview modal component already used in the Browse screen (`RecipePreviewModal` or equivalent)
- Triggered by `previewRecipeId !== null`
- Fetches `library.getRecipe(previewRecipeId)` on open; shows loading skeleton while fetching
- Has its own "+ Add to Plan" button inside the modal footer that calls `onAddRecipeId` then closes both modal and sheet
- Closing the modal sets `previewRecipeId` back to `null`; picker sheet remains open
- Modal renders above the sheet (`z-index` layering: backdrop 100, sheet 200, modal backdrop 300, modal 400)

### CSS classes (new)

| Class | Purpose |
|---|---|
| `.picker-backdrop` | Full-screen dimmed overlay |
| `.picker-sheet` | The sliding panel itself |
| `.picker-sheet--open` | Applied when `isOpen` is true |
| `.drag-handle` | 32 × 4 px pill, centered, `border-radius: 2px` |
| `.picker-search-bar` | Search input wrapper |
| `.my-recipes-row` | Horizontal scroll container |
| `.recipe-chip` | Individual personal-library pill card |
| `.category-chips` | Horizontal chip scroll row |
| `.all-recipes-grid` | CSS grid for server results |
| `.dish-card` | Individual server result card |
| `.dish-card--skeleton` | Shimmer loading placeholder |
| `.offline-banner` | Amber-tinted offline message bar |
| `.search-empty-state` | Zero-result message + Ask AI button |

### Accessibility

- Sheet has `role="dialog"` and `aria-label="Add a recipe"`
- Backdrop has `aria-hidden="true"`
- When sheet opens, focus moves to search input (described above)
- When sheet closes, focus returns to the trigger button on Home screen (stored in a ref before open)
- Drag handle has `aria-label="Drag to close"` and is keyboard-operable: `Enter` or `Space` triggers `onClose()`
- `Escape` key closes the sheet: `useEffect` adds `keydown` listener while `isOpen` is true
- Offline banner has `role="status"` for screen reader announcement on change
- Category chips use `aria-pressed` to indicate active state

### Integration point in HomeScreen

```typescript
// HomeScreen.tsx additions
const [pickerOpen, setPickerOpen] = useState(false);
const addDishTriggerRef = useRef<HTMLButtonElement>(null);

<button
  ref={addDishTriggerRef}
  class="btn btn--primary add-dish-trigger"
  onClick={() => setPickerOpen(true)}
>
  + Add Dish
</button>

<LibraryPickerSheet
  isOpen={pickerOpen}
  onClose={() => {
    setPickerOpen(false);
    addDishTriggerRef.current?.focus();
  }}
  onAddRecipeId={(id) => {
    pickLibraryRecipe(id);   // existing App.tsx handler passed as prop
    setPickerOpen(false);
  }}
  onOpenAiPrompt={(prefill) => openAiChat(prefill)}
/>
```

---

## Data & Dependencies

### Data sources

| Source | Access path | Used for |
|---|---|---|
| Personal library | `listCandidates()` → localStorage + IndexedDB `recipeStore` | My Recipes row |
| Server catalog | `library.searchDishes({ q, category, pageSize, page })` → `/api/library/search` | All Recipes grid |
| Recipe detail | `library.getRecipe(recipeId)` → `/api/library/recipe/:id` | Preview modal + addCandidate call |
| Category list | `/api/library/categories` (session-cached) | Category chip row |
| Ingredient color | `kindColorOf()` from `ingredientColor.tsx` | Card color swatch |

### Screens and components touched

| File | Change |
|---|---|
| `apps/web/src/screens/HomeScreen.tsx` | Remove inline LibraryBrowser; add `pickerOpen` state; mount `LibraryPickerSheet` |
| `apps/web/src/components/LibraryBrowser.tsx` | Retired or refactored into `LibraryPickerSheet` internals |
| `apps/web/src/components/LibraryPickerSheet.tsx` | New file — primary deliverable of this spec |
| `apps/web/src/components/DishCard.tsx` | New or extracted from LibraryBrowser; accepts `onAdd` and `onView` callbacks |
| `apps/web/src/components/RecipePreviewModal.tsx` | Reused; may need `onAddToplan` prop added if not already present |
| `apps/web/src/lib/library.ts` | No changes required; `searchDishes` and `getRecipe` signatures already correct |
| `apps/web/src/lib/candidates.ts` | No changes required; `listCandidates` and `addCandidate` already exist |
| `apps/web/src/App.tsx` | `pickLibraryRecipe` handler passed as prop to `HomeScreen` → `LibraryPickerSheet` |
| `apps/web/src/styles/` | New CSS for sheet, backdrop, drag handle, dish card, offline banner, search empty state |

### Edge cases

| Scenario | Behavior |
|---|---|
| Sheet opened while a fetch is in flight from a previous open | Abort previous fetch via `AbortController`; start fresh |
| User types, then clears query while a debounced fetch is pending | Debounce cancel; revert to unfiltered results (page 0) |
| `getRecipe` fails when opening preview modal | Show error state inside modal: "Couldn't load recipe — tap to retry" |
| Personal library is empty | My Recipes row and its section heading are not rendered; no empty state shown |
| `listCandidates` returns a recipe also present in server results | Both appear; no deduplication (user may have saved a modified version) |
| Sheet open on a very short viewport (< 500 px height) | Cap sheet at `calc(100vh - 48px)` to always leave the nav bar visible |
| User adds the same dish twice | `addCandidate` is idempotent by `recipeId`; second tap is a no-op; sheet still closes |
