# 09 — LibraryBrowser Component

## Overview

LibraryBrowser is a shared React component that renders the server-backed recipe catalog in two distinct contexts: as the full-page content of the Browse screen, and as the scrollable body of the dish-picker bottom sheet on the Home screen. Both contexts show the same category chips, search bar, recipe cards, pagination, and offline fallback — the only difference is chrome (wrapping). Centralizing this logic prevents the two surfaces from drifting apart and ensures that any catalog improvement (new filters, better card layout, offline handling) lands everywhere at once.

## Current State

Browse screen lives at `apps/web/src/screens/Browse.tsx`. It fetches from `/api/library/recipes` and renders category chips and recipe cards inline — all logic is local to the screen. The Home screen has a separate dish-picker implementation that queries the same endpoint but duplicates the search and filter state. There is no shared component; the two implementations are already diverging in subtle ways (different loading skeletons, different "no results" copy, different card tap behavior).

Relevant files:
- `apps/web/src/screens/Browse.tsx` — current full-page browse implementation
- `apps/web/src/screens/Home.tsx` — current picker sheet implementation
- `apps/web/src/components/RecipeCard.tsx` — card component used in both today
- `packages/engine/src/types.ts` — RecipeGraph type (server catalog returns a compatible summary shape)
- `apps/web/src/lib/api.ts` — fetch wrappers for `/api/library/*`
- `apps/web/src/stores/kitchenStore.ts` — diet preferences source

What works today: search, category filtering, server pagination, and adding dishes to the plan all function in both screens. The `prevScreen` fix in `App.tsx` means tapping a recipe card in Browse and then hitting Back correctly returns to Browse.

What is broken or missing: no shared abstraction, no offline fallback (a network error leaves the page blank with no message), no IntersectionObserver-based infinite scroll (Browse uses a Load More button; Home loads a fixed 20), and diet filtering is not applied server-side (it is filtered client-side after fetch, which means page sizes are inconsistent).

## Problem

From a user's perspective:

1. On the Home screen, the picker sheet and the Browse screen feel subtly different — different skeletons, different spacing — which erodes trust that they are showing the same catalog.
2. Going offline with the app open shows a blank list and no explanation. Users do not know whether the catalog is empty or the network is down.
3. Scrolling to the bottom of Browse and hitting "Load More" is a manual interrupt in what should be a continuous scroll.
4. Diet filters set in kitchen settings silently fail to reduce the Browse list correctly because the client-side post-filter does not account for page boundaries — a page of 20 might show only 3 results after filtering, with no indication that more exist.
5. Adding a dish from Browse requires tapping into the recipe detail and then tapping Add — there is no quick-add from the card itself in browse mode, making building a multi-dish plan slow.

## V2 Design

LibraryBrowser becomes a single component, `<LibraryBrowser>`, owned at `apps/web/src/components/LibraryBrowser.tsx`. Both Browse and Home import it.

**Mode prop drives chrome only.** In `browse` mode the component renders its own search bar, category chips, and card grid at full height. In `picker` mode it renders identically but without a search bar header (the bottom sheet's drag handle and the sheet's own header contain the close affordance); the search bar is still present but inset inside the sheet body.

**Diet filters go server-side.** The `diets` prop is forwarded as a `diet=vegan,vegetarian` query parameter on every fetch. This means page sizes are honest — 20 results means 20 displayable results.

**Infinite scroll replaces Load More.** An IntersectionObserver watches a `.sentinel` div pinned after the last card. When it enters the viewport and `!loading && hasMore`, the page counter increments and results append. The sentinel is invisible in normal flow.

**Offline banner replaces blank state.** On mount, the component registers `window.addEventListener('online'/'offline')`. If `navigator.onLine` is false, or if a fetch throws a network error, a sticky banner appears at the top of the list: "You're offline — showing your saved recipes." The card grid switches to the personal library (localStorage `tutti.candidates`, filtered by `q` and `category` client-side). When the device comes back online the banner dismisses and the server fetch resumes.

**Quick-add in both modes.** Every `DishCard` in LibraryBrowser shows a "+" button in the bottom-right corner. In `picker` mode this calls `onAddRecipeId` directly and the card flips to a check state. In `browse` mode the same button calls `onAddRecipeId` — the user's current plan is passed down as `selectedDishIds`, so the check state reflects what is already in the plan even when browsing full-screen. Tapping the card body (not the "+" button) always calls `onDetailsId` to open the preview modal, in both modes.

**No duplicated state.** Category chip data is fetched once inside LibraryBrowser on mount. The parent screens (Browse, Home) hold no catalog state of their own.

## Spec

### File location

```
apps/web/src/components/LibraryBrowser.tsx
apps/web/src/components/LibraryBrowser.css
```

### Props interface

```ts
interface LibraryBrowserProps {
  mode: "browse" | "picker";
  diets: string[];                   // from kitchen settings
  selectedDishIds: string[];         // IDs already in the active plan
  onAddRecipeId: (id: string) => void;
  onDetailsId: (id: string) => void;
  onClose?: () => void;              // picker mode only
}
```

### DishSummary shape

```ts
interface DishSummary {
  recipeId: string;
  name: string;
  category: string;
  cuisine: string;
  diets: string[];
  estMins: number;
  tier: "simple" | "moderate" | "complex";
  popularity: number;
}
```

### Internal state

```ts
const [q, setQ] = useState("");
const [category, setCategory] = useState<string | null>(null);
const [page, setPage] = useState(0);
const [results, setResults] = useState<DishSummary[]>([]);
const [loading, setLoading] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [offline, setOffline] = useState(!navigator.onLine);
const [categories, setCategories] = useState<CategoryChip[]>([]);
```

`q` and `category` changes reset `page` to 0 and `results` to `[]` before the next fetch fires. This reset must happen in the same state update batch to avoid a stale-page fetch: use a `useReducer` or co-locate the reset in a single `setState` call.

### Fetch logic

**Category chips** — fetched once on mount:

```
GET /api/library/categories
→ [{ slug: string, label: string, count: number }]
```

Result stored in `categories`. If offline, this fetch is skipped and the chip row is hidden.

**Recipe pages** — fetched when `q`, `category`, `diets`, or `page` changes:

```
GET /api/library/recipes
  ?q={q}
  &category={category ?? ""}
  &diet={diets.join(",")}
  &page={page}
  &pageSize=20
```

On success: if `page === 0`, replace `results`; if `page > 0`, append. Set `hasMore = data.length === 20`. On network error, set `offline = true` and fall through to personal library render.

Use `AbortController` — cancel the in-flight request when `q` or `category` changes before the previous fetch resolves. The `useEffect` cleanup function calls `controller.abort()`.

### IntersectionObserver

```ts
const sentinelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!sentinelRef.current) return;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !loading && hasMore) {
        setPage(p => p + 1);
      }
    },
    { rootMargin: "200px" }
  );
  observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, [loading, hasMore]);
```

The `rootMargin: "200px"` pre-triggers the load before the user reaches the absolute bottom.

### Offline personal library fallback

```ts
function getPersonalLibrary(q: string, category: string | null): DishSummary[] {
  const raw = localStorage.getItem("tutti.candidates");
  if (!raw) return [];
  const candidates: RecipeGraph[] = JSON.parse(raw);
  return candidates
    .filter(r =>
      (!q || r.name.toLowerCase().includes(q.toLowerCase())) &&
      (!category || r.category === category)
      // diets filtering omitted — personal recipes carry no diets field yet
    )
    .map(r => ({
      recipeId: r.recipeId,
      name: r.name,
      category: r.category ?? "Other",
      cuisine: r.cuisine ?? "",
      diets: [],
      estMins: estimateMins(r),   // sum of node.durationMins
      tier: "moderate",
      popularity: 0,
    }));
}
```

`estimateMins` is a local helper that sums `node.durationMins` across all nodes in the RecipeGraph.

### Offline banner

```tsx
{offline && (
  <div className="library-offline-banner" role="alert">
    You're offline — showing your saved recipes
  </div>
)}
```

CSS: `position: sticky; top: 0; z-index: 10; background: var(--color-warning-subtle); padding: 8px 16px; font-size: 0.85rem;`

When `navigator.onLine` becomes true (via `window.addEventListener('online', handler)`), set `offline = false`, reset `page = 0`, `results = []`, and re-trigger the server fetch.

### DishCard subcomponent

New component at `apps/web/src/components/DishCard.tsx`.

```tsx
interface DishCardProps {
  dish: DishSummary;
  selected: boolean;         // true if recipeId is in selectedDishIds
  onAdd: () => void;
  onDetails: () => void;
}
```

Layout: card with thumbnail placeholder (colored by `kindColorOf(dish.name)` from `ingredientColor.tsx`), dish name, category badge, tier dot, estMins. Bottom-right: `<button className="dish-card__add" aria-label="Add to plan">` — shows a "+" icon when `!selected`, a check icon when `selected`. Tapping the add button calls `onAdd()` and stops propagation. Tapping anywhere else on the card calls `onDetails()`.

CSS classes:
- `.dish-card` — base card
- `.dish-card--selected` — applied when `selected === true`; slightly muted border, check icon visible
- `.dish-card__add` — floating action button, bottom-right, 36 × 36px circle

### DOM structure (simplified)

```
.library-browser[data-mode="browse"|"picker"]
  .library-offline-banner (conditional)
  .library-browser__search
    <input type="search" placeholder="Search recipes…" />
  .library-browser__chips
    <button class="chip chip--active?"> per category + "All" </button>
  .library-browser__grid
    <DishCard> × results.length
    .library-browser__skeleton × 4  (when loading && results.length === 0)
    .sentinel (ref)
  .library-browser__empty (when !loading && results.length === 0)
    "No recipes found"
```

### Skeleton cards

When `loading && results.length === 0` (initial load), render 4 `.library-browser__skeleton` divs with the same dimensions as DishCard. Skeleton CSS uses a shimmer animation via `@keyframes shimmer` on a `linear-gradient` background-position. Do not show skeletons during append-page loads (page > 0); instead show a small spinner below the last card inside the sentinel wrapper.

### Category chip "All"

The first chip is always "All" (no slug). Tapping it sets `category = null`. Active chip gets `.chip--active` class. Chips scroll horizontally with `overflow-x: auto; white-space: nowrap;` and no visible scrollbar (`scrollbar-width: none`).

### Edge cases

- **Empty catalog + offline**: show offline banner + "No saved recipes yet" empty state (not the generic "No recipes found").
- **Search clears category**: when the user types in the search box, `category` resets to `null` and "All" chip becomes active. This avoids confusing zero-result states where both a category and a search term are active with no match.
- **Duplicate add**: if `selectedDishIds` already contains the `recipeId`, `onAddRecipeId` is still callable (in case of plan removal from the other direction) but the card shows the check state. The parent is responsible for toggling; LibraryBrowser does not toggle locally.
- **picker mode + onClose**: if `mode === "picker"` and `onClose` is not provided, no close button is rendered. The sheet's own drag-to-dismiss handles closure.
- **Very long dish names**: `.dish-card__name` is capped at 2 lines with `display: -webkit-box; -webkit-line-clamp: 2; overflow: hidden;`.
- **No network, no candidates**: show a single centered empty state with a WiFi-off icon and "Connect to browse the full catalog. Your saved recipes will appear here once you add some."

## Data & Dependencies

**Reads from:**
- `GET /api/library/recipes` — paginated catalog results
- `GET /api/library/categories` — chip list
- `localStorage tutti.candidates` — offline personal library fallback
- `navigator.onLine` + `window online/offline` events — connectivity state
- `props.diets` — sourced from `kitchenStore` by the parent screen
- `props.selectedDishIds` — sourced from the active plan in `planStore` by the parent screen

**Writes to:**
- Nothing directly. All mutations are surfaced through `onAddRecipeId` and `onDetailsId` callbacks.

**Used by:**
- `apps/web/src/screens/Browse.tsx` — wraps LibraryBrowser in `mode="browse"`, passes `diets` from `useKitchenStore()`, passes `selectedDishIds` from `usePlanStore()`, handles `onDetailsId` by pushing to `recipe` screen with `prevScreen = "browse"`, handles `onAddRecipeId` by calling `planStore.addDish()`.
- `apps/web/src/screens/Home.tsx` — renders LibraryBrowser inside the dish-picker bottom sheet in `mode="picker"`, passes same stores, handles `onDetailsId` by opening a preview modal (not navigating away), handles `onAddRecipeId` by calling `planStore.addDish()` and leaving the sheet open.

**Touches these existing components:**
- `RecipeCard.tsx` — will be superseded by `DishCard.tsx` for catalog cards; RecipeCard remains for personal-library display in Studio.
- `ingredientColor.tsx` — `kindColorOf()` used for card thumbnail color.
- `apps/web/src/lib/api.ts` — new exports `fetchLibraryRecipes(params)` and `fetchLibraryCategories()` replace inline fetch calls in both screens.
