# 08 — Browse Screen V2

## Overview

The Browse screen is the public catalog entry point — a searchable, filterable grid of all server-side recipes organized by cuisine category. Its job is discovery: a user who knows what they want to cook tonight should be able to find it in under 10 seconds, pick a tier, and add it to their plan without leaving the screen. Browse is read-only relative to the personal library; it surfaces the server catalog (600 recipes, 200 dishes × 3 tiers) and hands off to Studio for anything the user owns or edits.

---

## Current State

**File:** `apps/web/src/screens/BrowseScreen.tsx`

**What exists today:**
- Category chips rendered horizontally — no count badges, no scroll snap
- Search input — not debounced, searches name field only
- Dish cards — name, basic metadata; "Add" button calls `pickLibraryRecipe` immediately; "View" button opens a modal preview (`preview` screen or inline modal — inconsistent across builds)
- No tier is visible on the card; the user has no way to know whether they are adding a Simple, Standard, or Elaborate version
- No filter UI — category chips are the only narrowing mechanism
- No toast or confirmation after adding; the user has no feedback that anything happened
- No contextual label explaining what Browse is for vs. Studio

**Relevant files:**
- `apps/web/src/screens/BrowseScreen.tsx` — main screen component
- `apps/web/src/screens/PreviewScreen.tsx` — opened by "View" from Browse
- `packages/engine/src/types.ts` — `RecipeGraph` (recipeId, name, servings, nodes[], edges[], verified flag)
- `apps/web/src/lib/pickLibraryRecipe.ts` (or equivalent) — adds recipe to active plan
- `/api/library/*` — Supabase-backed server catalog; no direct browser→Supabase calls
- `apps/web/src/screens/SettingsScreen.tsx` — dietary preferences stored in kitchen settings (localStorage)
- `apps/web/src/ingredientColor.tsx` — `kindColorOf(name)` used for color swatch

**What works:** Category filtering, basic search, adding to plan, view-in-modal.

**What is broken or missing:**
- No tier visibility or tier selection on the card
- No add confirmation (silent action)
- No undo path after accidental add
- Search does not cover tags or ingredients
- No time or dietary filters
- No active-filter indicator
- No count badges on category chips

---

## Problem

From a real user's perspective:

1. **Which version am I adding?** The card shows "Butter Chicken" but not whether it is the 25-minute Simple version or the 90-minute Elaborate version. The user taps Add, gets the wrong tier in their plan, and has no idea until cook mode.

2. **Silent add is disorienting.** After tapping "+ Add," nothing changes on screen. The user cannot tell if it worked, double-taps, and ends up with the same dish twice in the plan.

3. **Discovery is shallow.** Search only matches the dish name. Searching "coconut" does not surface Coconut Chutney or dishes that use coconut as an ingredient. Dietary tags (vegan, gluten-free) are invisible.

4. **No time-based narrowing.** A user with 30 minutes to cook has no way to filter to short recipes — they have to read every card.

5. **No context between Browse and Studio.** Users who land on Browse for the first time do not know whether this is where their saved recipes live (it is not — that is Studio) or where the catalog lives.

---

## V2 Design

### Tab label and subtitle
The tab reads "Browse" with a persistent subtitle line "Find your next recipe" rendered below the screen title. This is the only label copy that distinguishes Browse (discovery, server catalog) from Studio (personal library, imports, collections).

### Category chips with count badges
Each chip shows `South Indian (48)`. Counts come from the catalog API response and are computed server-side. Chips are horizontally scrollable with no wrap. The selected chip is visually filled; unselected chips are outlined. An implicit "All" chip is first and always visible.

### Dish card redesign
Every card represents one dish with three tier variants. The card is the single surface where tier selection happens — the user never needs to drill into a detail screen to pick Simple vs. Elaborate.

Card anatomy (top to bottom):
1. **Color swatch bar** — 12px tall, full card width, color derived from the dominant ingredient kind via `kindColorOf`. Provides visual rhythm and ingredient-type wayfinding without text.
2. **Dish name** — bold, 16px, single line with ellipsis.
3. **Cuisine + dietary tags row** — small chips: cuisine label (e.g., "South Indian") + any dietary flags present on all three tiers (e.g., "Vegan", "Gluten-free"). Tags that apply only to some tiers are not shown at card level.
4. **Est. time chip** — `~35 min` — reflects the currently selected tier's projected cook time from the engine's compile output cached server-side. Updates when the user switches tier.
5. **Tier row** — three inline radio options: `Simple ○` / `Standard ●` / `Elaborate ○`. The filled circle marks the selected tier. Default is Standard. Selecting a tier updates the est. time chip immediately (client-side lookup from the card's preloaded tier metadata).
6. **Action row** — `+ Add to tonight's plan` (primary button, full width minus View) | `View` (secondary, text or ghost button).

### Tier selection
Each dish card carries preloaded metadata for all three tiers (name, projectedTime, recipeId) fetched as part of the catalog listing response. Tier selection is pure client state (`useState` on the card); no network call is needed to switch tiers. Only when the user taps "+ Add" does `pickLibraryRecipe` fire with the selected tier's `recipeId`.

### Add confirmation toast
After a successful add: a toast slides up from the bottom of the screen reading `"Butter Chicken added to tonight's cook"`. It persists for 2 seconds then slides out. It carries an **Undo** text link that calls `removeRecipeFromPlan(recipeId)` and dismisses the toast immediately. At most one toast is visible at a time; a second add while a toast is showing replaces it (reset timer, update dish name, update undo target).

### Search — debounced, multi-field
Search input debounces at 300ms. The query is matched against: dish name, cuisine tags, dietary tags, and ingredient names (from the nodes in the recipe graph). Matching is case-insensitive substring. Results replace the category-filtered list; the category chip selection is preserved visually but treated as an additional AND filter when a category is selected alongside a search query.

### Filter bottom sheet
A filter icon button in the header opens a bottom sheet with three filter groups:

1. **Diet** — toggles for dietary preferences pulled from kitchen settings (localStorage key `tutti.kitchen`). These are the same preferences used elsewhere in the app. Each toggle is labeled with the preference name ("Vegan", "Vegetarian", "Gluten-free", etc.). Enabling a toggle shows only dishes where at least one tier satisfies that requirement.

2. **Time** — single-select radio: `Any` / `Under 30 min` / `Under 60 min`. Filters based on the projected time of the currently selected tier on each card. Default: Any.

3. **Tier** — single-select radio: `Any` / `Simple` / `Standard` / `Elaborate`. When a tier filter is active, the tier row on each card pre-selects to match and becomes read-only (cannot conflict with the active filter). Default: Any.

Bottom sheet has a "Apply" button and an "X" close control. "Reset filters" link at the bottom of the sheet clears all three groups.

### Active filter indicator
When any filter is active, a chip reading `"2 filters"` (count of active filter groups, not individual toggles) appears in the screen header next to the filter icon. Tapping either the chip or the icon opens the filter sheet. When no filters are active the chip is absent.

---

## Spec

### Component tree

```
BrowseScreen
├── BrowseHeader
│   ├── <h1>"Browse"</h1>
│   ├── <p className="screen-subtitle">"Find your next recipe"</p>
│   ├── SearchInput (debounced 300ms, onChange → setQuery)
│   └── FilterTrigger (icon button + ActiveFilterChip)
├── CategoryChipBar (horizontal scroll, chips with count badges)
├── DishCardGrid (CSS grid, responsive columns)
│   └── DishCard × N
│       ├── DishCardSwatch (12px bar, background: kindColorOf(primaryIngredient))
│       ├── DishCardName
│       ├── DishCardTagRow (cuisine + dietary chips)
│       ├── DishCardTimeChip ("~{projectedMin} min")
│       ├── TierSelector (3 radio buttons, local state selectedTier)
│       └── DishCardActions
│           ├── AddButton ("+ Add to tonight's plan")
│           └── ViewButton ("View")
└── FilterBottomSheet (portal, open/close via filterSheetOpen state)
    ├── DietFilterGroup
    ├── TimeFilterGroup
    ├── TierFilterGroup
    └── FilterSheetFooter (Apply | Reset filters)
AddToast (portal, singleton, slides from bottom)
```

### State

```ts
// BrowseScreen local state
const [query, setQuery] = useState('')
const [debouncedQuery, setDebouncedQuery] = useState('')
const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
const [filterSheetOpen, setFilterSheetOpen] = useState(false)
const [filters, setFilters] = useState<BrowseFilters>({
  diet: [],          // string[] — subset of kitchen dietary prefs
  maxTime: null,     // 30 | 60 | null
  tier: null,        // 'simple' | 'standard' | 'elaborate' | null
})
const [toast, setToast] = useState<ToastState | null>(null)
// toast: { dishName: string, recipeId: string, timer: ReturnType<typeof setTimeout> }
```

```ts
// DishCard local state
const [selectedTier, setSelectedTier] = useState<TierKey>('standard')
// TierKey = 'simple' | 'standard' | 'elaborate'
```

### Types

```ts
interface DishListing {
  dishId: string
  name: string
  cuisine: string
  dietaryTags: string[]          // tags shared across ALL tiers
  primaryIngredient: string      // used for kindColorOf swatch
  tiers: Record<TierKey, TierMeta>
}

interface TierMeta {
  recipeId: string
  projectedMin: number
  available: boolean             // false if tier not yet in catalog
}

interface BrowseFilters {
  diet: string[]
  maxTime: 30 | 60 | null
  tier: TierKey | null
}

interface CategoryChip {
  label: string
  count: number
  value: string                  // slug used for API filtering
}
```

### API

- `GET /api/library/categories` → `CategoryChip[]` (cached, revalidated on mount)
- `GET /api/library/dishes?category=&q=&diet=&maxTime=&tier=&page=&pageSize=` → `{ dishes: DishListing[], total: number }`
  - Server applies all filters; client does not re-filter the response
  - `q` covers name, tags, ingredient names server-side
  - `pageSize=40`, infinite scroll via IntersectionObserver on a sentinel div at list bottom

### Active filter count

```ts
const activeFilterCount = [
  filters.diet.length > 0,
  filters.maxTime !== null,
  filters.tier !== null,
].filter(Boolean).length
// renders "N filters" chip when activeFilterCount > 0
```

### Toast behavior

```ts
function showToast(dishName: string, recipeId: string) {
  if (toast) clearTimeout(toast.timer)
  const timer = setTimeout(() => setToast(null), 2000)
  setToast({ dishName, recipeId, timer })
}

function handleUndo() {
  if (!toast) return
  clearTimeout(toast.timer)
  removeRecipeFromPlan(toast.recipeId)
  setToast(null)
}
```

Toast CSS: fixed, bottom: calc(var(--tab-bar-height) + 16px), centered, z-index above cards. Slide-up/slide-down via CSS keyframe on mount/unmount. Use a CSS class toggle rather than JS animation to respect `prefers-reduced-motion`.

### Tier row read-only when tier filter active

```tsx
<TierSelector
  value={selectedTier}
  onChange={setSelectedTier}
  readOnly={filters.tier !== null}
  // when readOnly, display only the locked tier; radio inputs disabled
/>
```

### CSS classes (new)

```
.browse-subtitle            // "Find your next recipe" muted text below h1
.category-chip-bar          // overflow-x: auto, scrollbar-width: none
.category-chip              // outlined pill; .category-chip--active for filled
.category-chip__count       // muted span inside chip
.dish-card                  // card root, border-radius var(--radius-md)
.dish-card__swatch          // height: 12px, border-radius top corners
.dish-card__tags            // flex-wrap, gap 4px
.dish-card__tag             // small pill, font-size 11px
.dish-card__time-chip       // small outlined chip
.tier-selector              // flex row, 3 options
.tier-selector__option      // label + radio
.tier-selector--readonly    // pointer-events: none, reduced opacity on unchosen options
.dish-card__actions         // flex row, gap 8px
.browse-filter-trigger      // icon button
.active-filter-chip         // small filled chip showing "N filters"
.filter-sheet               // bottom sheet portal
.add-toast                  // fixed bottom toast
.add-toast__undo            // inline text link inside toast
```

### Edge cases

- **Dish with fewer than 3 tiers:** `TierMeta.available = false` for missing tiers. Unavailable tier options are rendered disabled (greyed out, not interactive). If the user's default tier is unavailable, fall back to the nearest available tier.
- **No results:** Show "No dishes found for [query]" with a "Clear search" link. If filters are also active, show "Try removing some filters."
- **Network error on catalog fetch:** Show inline error state inside the grid area with a "Retry" button. Category chips and search remain functional so the user can try a narrower query.
- **Kitchen settings not configured:** Diet filter group shows all common dietary options (Vegan, Vegetarian, Gluten-free, Dairy-free, Nut-free) as unchecked toggles rather than pre-selecting from kitchen prefs.
- **Plan already contains dish at selected tier:** The Add button reads "Added ✓" and is disabled. Selecting a different tier re-enables the button for that tier.
- **Rapid tier switching:** `selectedTier` updates synchronously from preloaded `TierMeta`; no loading state needed.
- **Long dish name:** Single-line ellipsis on `DishCardName`; full name visible in the View modal.
- **Undo after navigating away:** Toast is dismissed when BrowseScreen unmounts. The undo action is only available while the toast is visible.

---

## Data & Dependencies

### Data sources

| Data | Source | Notes |
|---|---|---|
| Dish catalog | `GET /api/library/dishes` | Paginated, server-filtered |
| Category chips + counts | `GET /api/library/categories` | Cached per session |
| Dietary preferences | `localStorage tutti.kitchen` | Same store as Settings/Kitchen screens |
| Active plan | App-level plan state (Home screen state) | Read to detect "already added" state; write via `pickLibraryRecipe` / `removeRecipeFromPlan` |
| Ingredient color | `kindColorOf(primaryIngredient)` from `ingredientColor.tsx` | Client-side, no network |
| Tier projected times | Embedded in `DishListing.tiers[tier].projectedMin` | Server-computed, sent with listing |

### Screens and components this touches

- **HomeScreen** — `pickLibraryRecipe` and `removeRecipeFromPlan` mutate plan state owned by Home (or lifted to App). Browse must have access to these via prop or context. The "Already added ✓" state requires Browse to read current plan recipe IDs.
- **PreviewScreen** — "View" button navigates to `preview` screen with the selected tier's `recipeId` as parameter. On back, the previous screen is Browse (prevScreen tracking already in App.tsx).
- **SettingsScreen / KitchenScreen** — dietary preferences written there are read here for the Diet filter group defaults.
- **App.tsx** — screen navigation state machine; Browse does not own navigation but emits `setScreen('preview', { recipeId })` to App.
- **ingredientColor.tsx** — imported directly for swatch computation.
- **FilterBottomSheet** — new component, likely extracted to `apps/web/src/components/FilterBottomSheet.tsx` for potential reuse in future screens.
- **AddToast** — new component, `apps/web/src/components/AddToast.tsx`; singleton rendered inside BrowseScreen, positioned fixed above tab bar.
