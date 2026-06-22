# 23 — Empty States

## Overview

Empty states are the first real interaction many users have with a screen. A blank screen with no context is a dead end; a well-designed empty state is an onboarding moment that explains the purpose of the screen, makes clear why nothing is showing, and gives the user one obvious action to take next. In Tutti, empty states carry extra weight because the app is inherently sequential — dishes must be picked before a plan is built, and a plan must exist before cooking begins. Every empty state must respect that sequence and move the user forward along it.

---

## Current State

Empty states are inconsistent across the codebase. Some screens render nothing when their list is empty (Home with no candidates, Studio with no personal recipes). Others show a generic "No results" string with no CTA. The Pantry screen focuses an input correctly on mount. The Calendar renders day cells regardless of content, but empty days show nothing actionable. There is no shared `<EmptyState>` component — each screen rolls its own layout or omits one entirely.

Relevant files:
- `apps/web/src/screens/HomeScreen.tsx` — candidate list, no empty state branch
- `apps/web/src/screens/BrowseScreen.tsx` — search + category + diet filters, no empty branch
- `apps/web/src/screens/StudioScreen.tsx` — personal recipe list, no empty branch
- `apps/web/src/screens/MealsScreen.tsx` — cook history, no empty branch
- `apps/web/src/screens/CalendarScreen.tsx` — week grid, empty days show nothing
- `apps/web/src/screens/PantryScreen.tsx` — item list, auto-focuses input on mount
- `apps/web/src/screens/ShoppingScreen.tsx` — no empty branch when plan has no recipes

---

## Problem

From a real user's perspective:

- Opening Home for the first time and seeing a blank dish area with only a "Build Plan" button that does nothing is confusing. There is no signal that dishes must be added first.
- Searching Browse for an obscure dish and getting a blank list gives no recovery path — no clear button, no "try something else."
- Opening Studio with a fresh account shows an empty list with no explanation of what Studio is for or how to populate it.
- The Meals tab with no history is a blank white screen. New users have no idea what this screen does.
- Calendar empty days are silent — no affordance to add a meal for that day.
- Shopping list with no plan selected looks broken rather than instructional.

---

## V2 Design

V2 introduces a single shared `<EmptyState>` component used across all screens. Every instance follows the same three-line structure: a headline (what this screen is for), a subline (why it is empty right now), and one or two CTAs. Secondary CTAs are rendered as plain text links, not buttons, to preserve visual hierarchy. Copy is specific — it includes the user's actual search query when relevant. Navigation targets are explicit so CTAs never dead-end. The component accepts an optional illustration slot (a simple monochrome SVG icon, not a decorative illustration) to aid quick recognition at a glance.

---

## Spec

### Shared Component

**File:** `apps/web/src/components/EmptyState.tsx`

```tsx
interface EmptyStateProps {
  icon?: ReactNode;          // optional SVG icon, 48×48, currentColor
  headline: string;
  subline?: string;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
  chips?: { label: string; onClick: () => void }[];  // used on Home
  className?: string;
}
```

**CSS class:** `.empty-state` — centered column, `gap: 1.5rem`, `padding: 3rem 1.5rem`, `text-align: center`  
**Headline:** `.empty-state__headline` — `font-size: var(--text-lg)`, `font-weight: 600`, `color: var(--color-text-primary)`  
**Subline:** `.empty-state__subline` — `font-size: var(--text-sm)`, `color: var(--color-text-secondary)`  
**Primary CTA:** `.empty-state__primary` — full-width pill button, `background: var(--color-accent)`, `color: #fff`  
**Secondary CTA:** `.empty-state__secondary` — plain text link, `color: var(--color-accent)`, underline on hover  
**Chips:** `.empty-state__chips` — horizontal scroll row of `<Chip>` components, same component used in Browse category row

---

### 1. Home — no dishes selected

**Condition:** `candidates.length === 0` (no dishes added to the current meal)

**Rendered in:** `HomeScreen.tsx`, inside the dish list area above the "Build Plan" button

**Copy:**
- Headline: `Pick your dishes`
- Subline: `Choose what you want to cook and Tutti builds a parallel timeline so everything finishes together.`
- Primary CTA label: `Browse recipes` → navigates to `browse` screen
- Chips row (secondary shortcuts): `Quick dinners`, `30-min meals`, `Vegetarian`, `One-pot` — each chip navigates to Browse with that filter pre-applied

**Edge case:** "Build Plan" button must be disabled (not hidden) when `candidates.length === 0`, with a tooltip "Add at least one dish first".

---

### 2. Browse — no results for a text search

**Condition:** `searchQuery.trim().length > 0` AND `filteredRecipes.length === 0`

**Rendered in:** `BrowseScreen.tsx`, replacing the recipe grid

**Copy:**
- Headline: `No matches for "[searchQuery]"`
- Subline: `Try a different spelling, or ask Tutti to create it.`
- Primary CTA label: `Clear search` → clears `searchQuery` state, returns to full catalog
- Secondary CTA label: `Ask AI to create "[searchQuery]"` → navigates to `addRecipe` screen with `prefillName = searchQuery` passed as navigation param

**Note:** The AI-create link must be omitted if the search query is fewer than 3 characters (noise avoidance).

---

### 3. Browse — no results for category + diet filter combination

**Condition:** `searchQuery` is empty AND `activeCategory !== null || activeDietFilter !== null` AND `filteredRecipes.length === 0`

**Rendered in:** `BrowseScreen.tsx`, replacing the recipe grid

**Copy (diet filter active):**
- Headline: `No [activeDietLabel] [activeCategoryLabel] recipes yet`  
  Example: `No vegan pasta recipes yet`
- Subline: `The catalog grows regularly. Clear a filter to see more.`
- Primary CTA label: `Clear filters` → resets both `activeDietFilter` and `activeCategory` to `null`
- Secondary CTA label: `Clear category only` → resets only `activeCategory`, shown only when both a category AND a diet filter are active simultaneously

**Copy (category filter only, no diet filter):**
- Headline: `No [activeCategoryLabel] recipes yet`
- Subline: `This category is coming soon. Browse everything in the meantime.`
- Primary CTA label: `Browse all recipes` → resets `activeCategory` to `null`

---

### 4. Studio — no personal recipes

**Condition:** personal recipe store is empty (IndexedDB `recipeStore` returns zero records) AND `candidates` from localStorage is empty

**Rendered in:** `StudioScreen.tsx`, in the main list area

**Copy:**
- Headline: `Your recipes live here`
- Subline: `Save recipes from the catalog, import from a menu, or build your own from scratch.`
- Primary CTA label: `Browse catalog` → navigates to `browse` screen
- Secondary CTA label: `Paste a recipe` → navigates to `addRecipe` screen (text-paste flow)

---

### 5. Studio — search returns no matches

**Condition:** Studio search query is non-empty AND filtered personal recipe list is empty

**Rendered in:** `StudioScreen.tsx`, replacing the personal recipe list

**Copy:**
- Headline: `No recipes matching "[studioSearchQuery]"`
- Subline: `Only your saved recipes are searched here.`
- Primary CTA label: `Clear search` → clears `studioSearchQuery` state
- Secondary CTA label: `Search the catalog instead` → navigates to `browse` screen with `searchQuery = studioSearchQuery` pre-populated

---

### 6. Collections — empty collection

**Condition:** user opens a collection that exists (has a name and ID) but contains zero recipes

**Rendered in:** `CollectionsScreen.tsx` (or the collection detail view within Studio), inside the recipe list area

**Copy:**
- Headline: `This collection is empty`
- Subline: `Browse the catalog and save recipes to "[collectionName]".`
- Primary CTA label: `Browse catalog` → navigates to `browse` screen; after the user saves a recipe, the "Add to collection" sheet should offer this collection at the top

**Note:** The collection name in the subline must be truncated at 32 characters with an ellipsis.

---

### 7. Recipe editor — no steps

This is not a standalone empty state screen. When the step list is empty during editing, an inline validation message appears in the step list area.

**Condition:** `recipe.nodes.length === 0` AND the user attempts to save

**Rendered in:** `EditRecipeScreen.tsx`, inline below the steps section header

**Copy (inline, shown on attempted save only):**
- Validation message: `Add at least one step before saving.`
- Style: `.field-error` — `color: var(--color-error)`, `font-size: var(--text-sm)`, displayed inline, not as a toast or modal

**No dedicated empty state component is used here** — this is a form validation pattern, not a content-absent state.

---

### 8. Meals / Cook history — no meals cooked

**Condition:** cook history store returns zero completed sessions

**Rendered in:** `MealsScreen.tsx`, in the history list area

**Copy:**
- Headline: `Nothing cooked yet`
- Subline: `Every time you finish cooking with Tutti, the meal gets logged here with a timestamp and what you made.`
- Primary CTA label: `Start cooking` → navigates to `home` screen (Cook tab in V2 4-tab nav)

---

### 9. Calendar — no meals planned for a day

**Condition:** a specific day cell in the week grid has no planned meals

**Rendered in:** `CalendarScreen.tsx`, inside each empty `<DayCell>` component

**This is a micro empty state, not a full-screen one.** No shared `<EmptyState>` component — rendered inline within the day cell.

**Copy:**
- No headline, no subline
- Single element: a `+ Add` chip rendered as a small pill button
- CTA label: `+ Add` → opens a bottom sheet (or modal on desktop) to pick dishes for that date, pre-setting the calendar date as the target date for the plan

**Styling:** `.day-cell__add-chip` — `font-size: var(--text-xs)`, `color: var(--color-text-tertiary)`, `border: 1px dashed var(--color-border)`, `border-radius: 999px`, `padding: 0.2rem 0.6rem`; on hover `border-color: var(--color-accent)`, `color: var(--color-accent)`

---

### 10. Pantry — no items

**Condition:** pantry item store is empty

**Rendered in:** `PantryScreen.tsx`, replacing the item list

**Copy:**
- Headline: `Add what's in your kitchen`
- Subline: `Tutti uses your pantry to highlight what you already have when browsing recipes.`
- Primary CTA: none — instead, the text input for adding pantry items is focused automatically on mount (`useEffect(() => inputRef.current?.focus(), [])`)
- Secondary CTA label: `Import from last shopping list` → only shown if a previous shopping list exists in state; copies items from the last resolved shopping list into pantry

**Note:** Auto-focus already exists in the current `PantryScreen.tsx`. V2 retains this behavior and adds the headline/subline above the focused input rather than replacing the input with a CTA.

---

### 11. Shopping list — no plan / no recipes selected

**Condition:** no active `MasterExecutionPlan` exists, or the current plan has zero recipes

**Rendered in:** `ShoppingScreen.tsx`, replacing the ingredient list

**Copy:**
- Headline: `Add dishes to your plan first`
- Subline: `The shopping list is built from the recipes in your current meal plan.`
- Primary CTA label: `Go to Cook tab` → navigates to `home` screen (the Cook tab in V2 4-tab nav)

---

## Data & Dependencies

| Empty State | Data Checked | Navigation Target | Component Used |
|---|---|---|---|
| Home (no dishes) | `candidates` array length | `browse` | `<EmptyState>` + `<Chip>` row |
| Browse (no search results) | `searchQuery`, `filteredRecipes` length | `addRecipe` with `prefillName` param | `<EmptyState>` |
| Browse (no filter results) | `activeCategory`, `activeDietFilter`, `filteredRecipes` length | resets local filter state | `<EmptyState>` |
| Studio (no recipes) | IndexedDB `recipeStore` record count + `candidates` length | `browse`, `addRecipe` | `<EmptyState>` |
| Studio (no search results) | `studioSearchQuery`, filtered list length | `browse` with pre-populated query | `<EmptyState>` |
| Collections (empty) | collection detail record count | `browse` | `<EmptyState>` |
| Recipe editor (no steps) | `recipe.nodes.length` + save-attempted flag | none (inline validation) | Inline `.field-error` |
| Meals (no history) | cook history store record count | `home` | `<EmptyState>` |
| Calendar (no day meals) | per-day plan record | bottom sheet (date picker) | Inline `<DayCell>` chip |
| Pantry (no items) | pantry item store record count | none (auto-focus input) | Headline/subline above input |
| Shopping (no plan) | `MasterExecutionPlan` presence | `home` | `<EmptyState>` |

**Shared dependencies:**
- `<EmptyState>` component must be placed in `apps/web/src/components/` and exported from `apps/web/src/components/index.ts`
- Navigation in all CTAs uses the same `setScreen(screen: Screen)` pattern already established in `App.tsx`
- Filter reset CTAs mutate local component state — no global store writes required
- The `prefillName` parameter for the AI-create CTA in Browse requires `App.tsx` to accept an optional `addRecipeParams` state alongside `setScreen`, or use a lightweight URL param / context approach — this is a new requirement introduced by this spec
