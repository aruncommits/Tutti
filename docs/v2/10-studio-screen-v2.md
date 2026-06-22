# 10 — Studio Screen V2

## Overview

The Studio screen is the personal library hub where users manage recipes they own — recipes saved from the server catalog, generated via menu import, or created from scratch. Unlike Browse (which surfaces the server catalog), Studio surfaces only what belongs to the user: their saved recipes, custom creations, and organised collections. In V2, Studio gains a clearer purpose label, a unified three-action toolbar, richer recipe cards, collection-based filtering, and in-screen search so users can navigate even a large personal library without leaving the screen.

---

## Current State

**File:** `apps/web/src/screens/StudioScreen.tsx`

What exists today:
- Lists `candidates` from `localStorage` key `tutti.candidates` (array of `RecipeGraph`)
- Supplemented by `IndexedDB` `recipeStore` for full graph payloads
- Two action buttons: **New recipe** (`setScreen("addRecipe")`) and **Import a menu** (`setScreen("menuImport")`)
- Each recipe card renders: name, tier label, and four inline buttons — Open, Edit, Duplicate, Remove
- A **Collections** section stub exists but has no filtering behaviour; collections are stored as metadata on candidates
- No search field
- No empty state copy
- No verified/unverified visual distinction
- No last-cooked indicator

**Related files:**
- `apps/web/src/App.tsx` — wires `"studio"` screen branch; merges candidates into `allRecipes`; routes `"addRecipe"` and `"menuImport"`
- `apps/web/src/screens/HomeScreen.tsx` — `LibraryBrowser` picker shows candidates in a "My Recipes" section
- `packages/engine/src/types.ts` — `RecipeGraph` type: `recipeId`, `name`, `servings`, `nodes[]`, `edges[]`, `verified` flag
- `apps/web/src/ingredientColor.tsx` — `kindColorOf(name)` for ingredient color swatches
- `apps/web/src/state.ts` — `Screen` union type includes `"studio"`
- `apps/web/src/validators.ts` — `SCREENS` set includes `"studio"`

What works:
- CRUD round-trip: create via addRecipe, persist to IndexedDB, list in Studio, edit, duplicate, remove
- Menu import flow: Import menu button correctly navigates to `menuImport`; parsed recipes land in candidates

What is broken or missing:
- Collections section renders but tapping a collection does not filter the recipe list
- No search; users with more than ~10 personal recipes have no way to find a specific one quickly
- No visual distinction between a recipe the user created themselves versus one saved from the server catalog (verified flag unused in Studio)
- No last-cooked timestamp surfaced
- Three-button layout not yet implemented (New collection is missing entirely)
- Card overflow menu (⋮) does not exist; all four actions are always visible, making cards cluttered

---

## Problem

From a real user's perspective:

1. **Clutter on every card.** Four equally-weighted buttons (Open, Edit, Duplicate, Remove) sit inline on every card. At 20+ recipes the screen becomes a wall of buttons. Secondary actions like Duplicate and Remove should be tucked away.

2. **No way to find a recipe fast.** There is no search. A user who imported 15 dishes from a restaurant menu must scroll to find the one they want.

3. **Collections do nothing.** The collections section is visible but tapping a pill has no effect on the list below it. Users who organise recipes into collections get no payoff.

4. **No sense of provenance.** A recipe saved from the server catalog (verified, community-tested) looks identical to one the user typed in themselves (unverified). Users cannot tell which to trust when cooking for guests.

5. **No memory of use.** There is no "last cooked" signal, so users cannot quickly identify their go-to recipes versus ones they saved speculatively.

6. **No purpose label.** The screen has no subtitle explaining what Studio is for. New users arriving from Browse or onboarding do not immediately understand this is their personal space.

7. **Missing "New collection" action.** There is no way to create a collection from within Studio; collections can only be implied by the add-to-collection flow on a card — but that flow does not exist yet either.

---

## V2 Design

**Purpose label.** A subtitle line beneath the "Studio" heading reads: *Your recipes · Collections · Import*. This communicates the three things Studio does without requiring users to explore.

**Three-button toolbar.** Replace the two ad-hoc buttons with a uniform row of three equal-width pill buttons: `[+ New recipe]`, `[Import menu]`, `[+ New collection]`. Each maps to an existing or new action. This establishes Studio as a creation hub, not just a list.

**Search field.** A search input at the top of the recipe list filters `candidates` by name (case-insensitive substring). No server call — filtering is local and instant. Search is always visible (not hidden behind an icon) because the library can grow large.

**Richer recipe cards.** Cards are redesigned:
- Left edge: a narrow color swatch derived from the recipe's dominant ingredient color (`kindColorOf` on the first ingredient node), giving instant visual differentiation in a long list
- Name (primary text)
- Tier badge: `simple` / `moderate` / `complex` pill, coloured by tier
- Verified badge: a small `✓ verified` chip in green for recipes where `verified === true`; for user-created recipes (unverified) the chip reads `• custom` in muted gray — never blank, so the distinction is always explicit
- Last-cooked chip: if the recipe has a `lastCooked` timestamp in its candidate metadata, render "Cooked 3 days ago" using a relative date; omit entirely if never cooked
- Primary actions inline: **Open** and **Edit** buttons
- **⋮** overflow button opens a small popover menu with: Duplicate, Add to collection, Remove

**Collection pills filter.** The Collections section renders pills for each collection the user has created. Tapping a pill sets an active filter; the recipe list below narrows to only recipes tagged to that collection. Tapping the active pill again clears the filter. An **All** pill is always present and selected by default. This replaces the current no-op collection display.

**New collection action.** The `[+ New collection]` button opens an inline name prompt (a small modal or inline text field) and creates an empty collection entry. The collections list is stored in `localStorage` under `tutti.collections` as an array of `{ id, name, recipeIds[] }`.

**Empty state.** When `candidates` is empty (or the search/filter returns zero results), show a centred illustration, the copy "No recipes yet. Browse the catalog or paste a recipe to get started." and a **Browse catalog** button that navigates to `"browse"`. This replaces the current blank list.

**No changes to navigation:** Import menu → `"menuImport"` and New recipe → `"addRecipe"` remain as-is. The Back button on `addRecipe` and `menuImport` returns to `"studio"` via `prevScreen` tracking already in `App.tsx`.

**Studio's role in Home picker is unchanged:** `allRecipes` merger in `App.tsx` continues to include all candidates; the `LibraryBrowser` "My Recipes" section continues to show candidates first. No changes needed to `HomeScreen.tsx`.

---

## Spec

### Component tree

```
StudioScreen
├── StudioHeader
│   ├── <h1>Studio</h1>
│   └── <p className="studio-subtitle">Your recipes · Collections · Import</p>
├── StudioToolbar
│   ├── <button className="studio-action-btn">+ New recipe</button>
│   ├── <button className="studio-action-btn">Import menu</button>
│   └── <button className="studio-action-btn">+ New collection</button>
├── StudioSearch
│   └── <input placeholder="Search your recipes…" />
├── CollectionsSection
│   ├── <h2>Collections</h2>
│   └── CollectionPills
│       ├── <button className="collection-pill [active]">All</button>
│       └── <button className="collection-pill">…name…</button>  (×N)
├── RecipeListSection
│   ├── <h2>My Recipes</h2>  (shows count: "My Recipes (12)")
│   ├── RecipeCard  (×N, filtered by search + active collection)
│   └── EmptyState  (rendered when filtered list is empty)
└── NewCollectionModal  (conditionally rendered)
```

### StudioScreen props and state

```typescript
// Props passed from App.tsx (same pattern as other screens)
interface StudioScreenProps {
  candidates: RecipeGraph[];
  setCandidates: (c: RecipeGraph[]) => void;
  setScreen: (s: Screen) => void;
  setPrevScreen: (s: Screen) => void;
}

// Internal state
const [searchQuery, setSearchQuery] = useState("");
const [activeCollection, setActiveCollection] = useState<string | null>(null); // collection id or null = All
const [collections, setCollections] = useState<Collection[]>(() =>
  JSON.parse(localStorage.getItem("tutti.collections") ?? "[]")
);
const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
const [openMenuId, setOpenMenuId] = useState<string | null>(null); // recipeId with open ⋮ menu
```

### Collection type

```typescript
interface Collection {
  id: string;          // nanoid()
  name: string;
  recipeIds: string[]; // recipeId references
}
```

Persisted to `localStorage` key `tutti.collections`. Read on mount, written on every mutation (create collection, add/remove recipe from collection, delete collection).

### RecipeCard props

```typescript
interface RecipeCardProps {
  recipe: RecipeGraph;
  collections: Collection[];
  isMenuOpen: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onAddToCollection: (collectionId: string) => void;
  onRemove: () => void;
  onMenuToggle: () => void;
}
```

### RecipeCard layout (CSS grid)

```
[swatch] [name + badges row] [actions]
```

- `.recipe-card-swatch` — 4px wide left border, color from `kindColorOf(recipe.nodes[0]?.label ?? "")`, falls back to `var(--color-border)` if no nodes
- `.recipe-card-name` — `font-weight: 600`
- `.recipe-card-badges` — flex row, gap 6px:
  - `.tier-badge.tier-{simple|moderate|complex}` — pill, colored per tier token
  - `.verified-badge` — `✓ verified` in `var(--color-success)` if `recipe.verified`; `• custom` in `var(--color-text-muted)` if `!recipe.verified`
  - `.last-cooked-chip` — "Cooked X days ago" — only rendered if `(recipe as CandidateMeta).lastCooked` is defined
- `.recipe-card-actions` — flex row, align right:
  - `<button className="btn-ghost">Open</button>`
  - `<button className="btn-ghost">Edit</button>`
  - `<button className="btn-icon" aria-label="More options">⋮</button>`

### CandidateMeta extension

The `RecipeGraph` stored in candidates should carry optional metadata. Extend (or cast) to:

```typescript
interface CandidateMeta extends RecipeGraph {
  lastCooked?: number; // Unix ms timestamp, written by CookScreen on completion
  collectionIds?: string[]; // redundant index for fast filter; source of truth is tutti.collections
}
```

`lastCooked` is written by `CookScreen` when the user completes a cook session. If `CookScreen` does not yet write this field, the chip simply never renders (safe fallback — do not block Studio V2 on this).

### ⋮ overflow menu

Rendered as an absolutely-positioned `<div className="card-overflow-menu">` anchored below the ⋮ button. Closed by: clicking outside (document `mousedown` listener), pressing Escape, or selecting an item. Only one menu open at a time (`openMenuId` state).

Menu items:
- **Duplicate** — deep-clone recipe, assign new `recipeId` via `nanoid()`, push to `candidates`, persist to IndexedDB, close menu
- **Add to collection** — renders a sub-list of existing collections with checkboxes; toggling a collection adds/removes this `recipeId` from `collection.recipeIds` and writes `tutti.collections` + updates `recipe.collectionIds`
- **Remove** — shows a confirmation: "Remove [name]? This cannot be undone." with Cancel / Remove buttons; on confirm, splices from `candidates`, deletes from IndexedDB, removes `recipeId` from all `collection.recipeIds`

### Search filtering

```typescript
const filtered = candidates.filter((r) => {
  const matchesSearch = r.name
    .toLowerCase()
    .includes(searchQuery.toLowerCase().trim());
  const matchesCollection =
    activeCollection === null ||
    collections
      .find((c) => c.id === activeCollection)
      ?.recipeIds.includes(r.recipeId) ?? false;
  return matchesSearch && matchesCollection;
});
```

Search and collection filter compose (AND). Both are applied client-side with no debounce needed (IndexedDB reads are already complete by the time Studio mounts).

### New collection flow

Clicking `[+ New collection]` sets `showNewCollectionModal = true`. The modal renders:
- `<input placeholder="Collection name" autoFocus />`
- **Create** button (disabled if name is empty or duplicate)
- **Cancel** button

On Create: push `{ id: nanoid(), name: trimmed, recipeIds: [] }` to `collections`, write `tutti.collections`, close modal.

### Empty state

Rendered when `filtered.length === 0`:

```tsx
<div className="studio-empty">
  {searchQuery || activeCollection ? (
    <>
      <p>No recipes match your search.</p>
      <button onClick={() => { setSearchQuery(""); setActiveCollection(null); }}>
        Clear filters
      </button>
    </>
  ) : (
    <>
      <p>No recipes yet. Browse the catalog or paste a recipe to get started.</p>
      <button onClick={() => setScreen("browse")}>Browse catalog</button>
    </>
  )}
</div>
```

Two distinct empty states: one for "filtered to zero" (offer to clear filters) and one for "truly empty library" (offer to go to Browse).

### Toolbar button actions

| Button | Action |
|---|---|
| `+ New recipe` | `setPrevScreen("studio"); setScreen("addRecipe")` |
| `Import menu` | `setPrevScreen("studio"); setScreen("menuImport")` |
| `+ New collection` | `setShowNewCollectionModal(true)` |

`setPrevScreen` ensures Back on `addRecipe` and `menuImport` returns to Studio.

### CSS classes (new, follow existing naming)

- `.studio-subtitle` — muted text, `font-size: var(--text-sm)`
- `.studio-toolbar` — flex row, gap 8px, `margin-bottom: var(--space-4)`
- `.studio-action-btn` — pill button, `flex: 1`, border, no fill (ghost style)
- `.studio-search` — full-width input, `margin-bottom: var(--space-3)`
- `.collection-pill` — pill button; `.collection-pill.active` — filled with `var(--color-primary)`
- `.recipe-card` — card with left swatch; replaces existing card styles
- `.recipe-card-swatch` — `width: 4px; border-radius: 4px 0 0 4px; background: <computed>`
- `.tier-badge.tier-simple` / `.tier-moderate` / `.tier-complex` — distinct background tokens
- `.verified-badge` — inline chip
- `.last-cooked-chip` — muted chip
- `.card-overflow-menu` — absolutely positioned popover, `z-index: var(--z-popover)`
- `.studio-empty` — centred flex column, padding, muted icon placeholder

---

## Data & Dependencies

### Data sources

| Data | Source | Notes |
|---|---|---|
| `candidates` | `localStorage` `tutti.candidates` (array) + IndexedDB `recipeStore` (full graphs) | Loaded in `App.tsx`, passed as prop |
| `collections` | `localStorage` `tutti.collections` | Loaded and owned by `StudioScreen` |
| Ingredient color | `kindColorOf()` in `ingredientColor.tsx` | Pure function, no async |
| `lastCooked` | Field on candidate `RecipeGraph` in IndexedDB | Written by `CookScreen` on session end; may be absent |
| `verified` flag | Field on `RecipeGraph` | Set to `true` for recipes originating from server catalog; `false` or absent for user-created |

### Screens this touches

| Screen | Relationship |
|---|---|
| `addRecipe` | Studio → addRecipe (New recipe); addRecipe back → Studio via prevScreen |
| `menuImport` | Studio → menuImport (Import menu); menuImport back → Studio via prevScreen |
| `recipe` | Studio → recipe (Open); recipe back → Studio via prevScreen |
| `editRecipe` | Studio → editRecipe (Edit); editRecipe back → Studio via prevScreen |
| `browse` | Studio empty state → Browse catalog button |
| `home` | Downstream consumer — candidates merged into `allRecipes` in App.tsx for LibraryBrowser picker; no direct navigation from Studio |
| `cook` | Writes `lastCooked` timestamp to candidate on session completion; Studio reads it |

### Components this shares

- `ingredientColor.tsx` — `kindColorOf` for card swatches
- Tier badge styling — same tokens used in `RecipeScreen` and `BrowseScreen` preview cards; extract to shared `TierBadge` component if not already done
- `nanoid` — already a dependency; used for collection id and duplicate recipeId generation

### Edge cases

- **Candidate with no nodes** — `kindColorOf` receives empty string; falls back to `var(--color-border)` swatch; safe
- **`verified` flag absent** — treat as `false`; render `• custom` chip
- **Collection referencing a deleted recipe** — `recipeIds` may contain stale ids; filter by cross-referencing against live `candidates` array before rendering Add to collection checkboxes; clean up stale ids on Remove
- **Duplicate collection name** — block creation; show inline validation message "A collection with that name already exists"
- **Large candidate list (100+)** — filtering is synchronous and fast; no virtualisation needed at this scale, but cap rendered cards at 200 with a "showing first 200" notice if needed
- **⋮ menu and scroll** — use `position: fixed` with JS-computed coordinates if the card is near the viewport bottom, to prevent clipping
