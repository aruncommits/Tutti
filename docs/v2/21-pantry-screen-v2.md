# 21 — Pantry Screen V2

## Overview

The Pantry screen is a personal ingredient inventory that tracks what the user has at home. It exists to make the rest of the app smarter: shopping lists subtract pantry stock before surfacing what to buy, and a "Cook Now" filter in Browse surfaces recipes that can be cooked with what is already on hand. In V2 the screen moves from the bottom nav into the Me tab, gains expiry tracking, category grouping, low-stock badges, and a one-tap import from a completed shopping list.

---

## Current State

**File:** `apps/web/src/screens/PantryScreen.tsx`

The existing implementation is a flat list of pantry items backed by `usePersistentState("tutti.pantry", [], isPantryArray)`. Each item carries `{ id, name, quantity, unit }`. The screen provides a text input to add an item, a quantity spinner, and a remove button per row. Items are rendered in insertion order with no grouping.

Shopping list subtraction reads this store via `usePantry()` and filters the ingredient list before surfacing what to buy. No expiry, no category, no low-stock concept exists today.

The pantry is reachable from the bottom tab bar in V1 (Settings area). After the V2 tab restructure it will live under the Me tab alongside Calendar, Meals, and Settings, accessible via a segmented control or vertical sub-nav within Me.

**What works today:**
- `usePantry()` hook (`apps/web/src/hooks/usePantry.ts`) — exposes `items`, `addItem`, `removeItem`, `updateQuantity`
- Validator `isPantryArray` in `apps/web/src/validators.ts`
- Shopping list integration: `ShoppingScreen.tsx` calls `subtractPantry(shoppingLines, pantryItems)` before rendering

**What is broken or missing:**
- No expiry date field
- No category grouping
- No low-stock threshold or badge
- No import-from-shopping-list shortcut
- No autocomplete on the name input
- No "Cook Now" bridge to Browse
- Empty state is a blank screen, not a prompt

---

## Problem

From a real user's perspective:

1. **Invisible waste.** There is no way to mark that yoghurt expires Friday. The user either throws it away or discovers it too late. The app offers no help.
2. **Flat list doesn't scale.** After 15 items the list becomes hard to scan. There is no way to jump to "where did I put the cumin."
3. **Re-entry friction after shopping.** The user finishes a shopping trip, comes home, and has to manually re-enter every item they just bought — items the app already knew about because they were on the shopping list.
4. **Browse doesn't know what you own.** A user with a full pantry still sees every recipe, including ones that need a special ingredient they don't have. There is no "what can I cook right now?" shortcut.
5. **Low stock is invisible.** Running low on olive oil only becomes apparent at cook time. There is no ambient signal in the pantry view.
6. **Cold start is confusing.** An empty pantry screen with no guidance leaves the user unsure why it exists or what to do first.

---

## V2 Design

**Move to Me tab.** Pantry is household management, not navigation. It belongs alongside Settings and Meals, reachable via the Me tab's sub-nav (`<MeTabNav>`). No bottom-tab slot is consumed.

**Add expiry tracking.** An optional `expiresAt` timestamp per item. Items expiring within 7 calendar days are pulled into an "Expiring soon" section pinned to the top of the list, rendered on an amber background card. This is the only interruptive UI; everything else is ambient.

**Category grouping.** Items are grouped under five categories: Produce, Dairy, Dry goods, Spices, Frozen. The category is either inferred from a hardcoded staples map or chosen manually via a picker. Collapsed/expanded state per category is stored in `sessionStorage` (not persistent — reset on each visit is fine). An "Other" overflow bucket catches anything unclassified.

**Autocomplete from staple list.** The name input offers dropdown suggestions from a hardcoded list of 50 common pantry staples (see Spec). Autocomplete pre-fills unit and category, saving the most common taps. Free-text entry still works for anything not in the list.

**Low-stock badge.** Each item has an optional `lowThreshold` number. When `quantity <= lowThreshold`, the item renders a small amber "Low" badge beside the quantity. The threshold can be set from the edit sheet; it defaults to `null` (no badge). This is intentionally opt-in — forcing thresholds on every item would create noise.

**Import from shopping list.** A banner at the top of the Pantry screen (shown only when a completed shopping trip exists in state) reads "You just shopped — add to pantry?" with an "Import" button. Tapping it opens a checklist of every item from the last shopping list, pre-checked, letting the user deselect anything they didn't buy, then bulk-add the rest. This removes re-entry friction entirely.

**Cook Now filter in Browse.** A pill button labelled "Cook Now" appears in Browse's filter row. When active, Browse passes the pantry ingredient name list to the library query: `GET /api/library/recipes?pantryFilter=true&pantryItems=flour,eggs,...`. The server checks whether all of a recipe's required ingredients appear in the passed list (case-insensitive, fuzzy-trimmed). Recipes that do not match are hidden. A sub-label "X recipes you can make now" appears below the pill when active.

**Empty state.** A centered illustration placeholder, the text "Your pantry is empty", and a sub-line "Add items here to get smarter shopping lists and see what you can cook right now." Two CTAs: primary "Add item" (opens the add sheet), secondary "Import from last shop" (disabled and dimmed if no shopping history exists).

---

## Spec

### Data model

```ts
interface PantryItem {
  id: string;               // nanoid()
  name: string;
  quantity: number;
  unit: string;             // e.g. "g", "ml", "pcs", "tbsp"
  category: PantryCategory;
  expiresAt?: number;       // Unix ms timestamp, optional
  lowThreshold?: number;    // quantity level below which "Low" badge shows, optional
}

type PantryCategory =
  | "produce"
  | "dairy"
  | "dry-goods"
  | "spices"
  | "frozen"
  | "other";
```

Validator: extend `isPantryArray` in `validators.ts` to require `category: string` and accept optional `expiresAt: number` and `lowThreshold: number`. Existing records without `category` are migrated to `"other"` on first read inside `usePantry()`.

### Storage

`usePersistentState("tutti.pantry", [], isPantryArray)` — unchanged key, schema evolved in place. Migration runs in `usePantry()` init:

```ts
const migrated = raw.map(item =>
  item.category ? item : { ...item, category: "other" }
);
```

### Hook: `usePantry()`

**Location:** `apps/web/src/hooks/usePantry.ts`

New exports added to the existing hook:

```ts
addItem(draft: Omit<PantryItem, "id">): void
removeItem(id: string): void
updateItem(id: string, patch: Partial<PantryItem>): void   // replaces updateQuantity
importFromShopping(items: ShoppingLine[]): void            // bulk-add from shopping list
expiringSoon: PantryItem[]    // items where expiresAt is within 7 days (computed, not stored)
lowStockItems: PantryItem[]   // items where quantity <= lowThreshold (computed, not stored)
itemsByCategory: Record<PantryCategory, PantryItem[]>      // grouped, sorted alphabetically within group
```

`expiringSoon` threshold: `Date.now() + 7 * 24 * 60 * 60 * 1000`.

### Component tree

```
PantryScreen
├── PantryImportBanner          (conditional — shown when lastShoppingList exists)
├── ExpiringSection             (conditional — shown when expiringSoon.length > 0)
│   └── PantryItemRow[]         (amber background, expiry date chip)
├── PantrySearchBar             (filters visible items by name; local state only)
├── CategorySection[]           (one per non-empty PantryCategory)
│   ├── CategoryHeader          (label + item count + collapse chevron)
│   └── PantryItemRow[]
│       ├── LowBadge            (conditional)
│       └── ExpiryChip          (conditional — only in ExpiringSection; reused here if item has expiresAt)
├── AddItemFAB                  (+ button, fixed bottom-right)
└── AddItemSheet                (bottom sheet, portal)
    ├── NameInput + Autocomplete
    ├── QuantityInput
    ├── UnitPicker
    ├── CategoryPicker
    ├── ExpiryDateInput         (optional; date type input)
    └── LowThresholdInput       (optional; number)
```

**`PantryItemRow` props:**
```ts
interface PantryItemRowProps {
  item: PantryItem;
  onUpdate: (patch: Partial<PantryItem>) => void;
  onRemove: () => void;
  showExpiry?: boolean;
}
```

Swipe-left on a row reveals a red Delete button (same gesture as ShoppingScreen uses today). Tapping the row opens the AddItemSheet pre-filled for editing.

### Autocomplete staple list

Hardcoded in `apps/web/src/data/pantryStaples.ts`. Fifty entries, each with `{ name, unit, category }`:

Produce: tomatoes (pcs, produce), onions (pcs, produce), garlic (pcs, produce), ginger (g, produce), potatoes (pcs, produce), carrots (pcs, produce), spinach (g, produce), lemon (pcs, produce), cucumber (pcs, produce), bell pepper (pcs, produce)

Dairy: milk (ml, dairy), butter (g, dairy), yoghurt (g, dairy), cheese (g, dairy), eggs (pcs, dairy), cream (ml, dairy), paneer (g, dairy)

Dry goods: rice (g, dry-goods), flour (g, dry-goods), lentils (g, dry-goods), chickpeas (g, dry-goods), pasta (g, dry-goods), oats (g, dry-goods), sugar (g, dry-goods), salt (g, dry-goods), baking powder (g, dry-goods), bread (pcs, dry-goods), olive oil (ml, dry-goods), vegetable oil (ml, dry-goods), soy sauce (ml, dry-goods), vinegar (ml, dry-goods), honey (ml, dry-goods), coconut milk (ml, dry-goods), stock cubes (pcs, dry-goods)

Spices: cumin (g, spices), coriander (g, spices), turmeric (g, spices), chilli powder (g, spices), paprika (g, spices), garam masala (g, spices), black pepper (g, spices), cinnamon (g, spices), cardamom (g, spices), mustard seeds (g, spices), dried oregano (g, spices), dried thyme (g, spices), bay leaves (pcs, spices)

Frozen: peas (g, frozen), corn (g, frozen), mixed vegetables (g, frozen)

Autocomplete fires on input with 2+ characters, filters by `name.startsWith(query)` (case-insensitive), shows maximum 6 suggestions in a dropdown below the input. Selecting a suggestion fills name, unit, and category fields.

### Import from shopping list

`PantryImportBanner` reads `lastCompletedShopping` from `useShoppingStore()`. The value is set when the user taps "Done" on the Shopping screen (marks the trip complete). The banner persists until the user either imports or dismisses it; dismissal writes a `tutti.pantryImportDismissed` flag keyed to the shopping session ID so it does not reappear for the same trip.

Tapping "Import" opens a modal (`ImportFromShoppingModal`) with a checklist. Each row shows item name and quantity. All rows pre-checked. "Add X items to pantry" button at bottom calls `importFromShopping(selected)`. Items are mapped to `PantryItem` by matching name against the staples list for unit and category inference; unmatched items default to `unit: "pcs", category: "other"`.

### Cook Now filter (Browse integration)

**Browse side (`BrowseScreen.tsx`):**

```ts
const { items: pantryItems } = usePantry();
const [cookNowActive, setCookNowActive] = useState(false);
const pantryNames = pantryItems.map(i => i.name.toLowerCase());
```

A pill `<CookNowPill active={cookNowActive} count={cookNowCount} onClick={toggle} />` sits in the filter row immediately after the search bar and before category chips. When `cookNowActive`, the query includes:

```
GET /api/library/recipes?pantryFilter=true&pantryItems=flour%2Ceggs%2C...
```

`cookNowCount` is populated from the API response header `X-Cook-Now-Count` (integer), set by the server after applying the filter. If the pantry is empty, the pill is disabled with a tooltip "Add pantry items first".

**Server side (`/api/library/recipes` route):**

When `pantryFilter=true`, the route reads `pantryItems` query param, splits on comma, normalises (lowercase, trim). For each recipe candidate it checks: all ingredient names in the recipe's node list appear in the pantry set (using a `normalise(name).includes(pantryWord)` heuristic to handle "garlic cloves" matching "garlic"). Recipes failing this check are excluded from the result set. `X-Cook-Now-Count` is set to `filteredCount`.

### Expiring soon section

Rendered above all category sections when `expiringSoon.length > 0`. Background: CSS variable `--color-warning-subtle` (amber tint). Section header: "Expiring soon" with a clock icon. Items within show an `<ExpiryChip>` displaying the human-readable relative date ("Today", "Tomorrow", "in 3 days"). Chip background: red if `expiresAt < Date.now() + 24h`, amber otherwise.

### Low-stock badge

`<LowBadge />` — a small pill with text "Low", colour `--color-warning` (amber). Rendered inline after the quantity display in `PantryItemRow` when `item.quantity <= item.lowThreshold`. No badge if `lowThreshold` is null or undefined.

### CSS classes (BEM, existing pattern)

```
.pantry-screen
.pantry-import-banner
.pantry-import-banner__text
.pantry-import-banner__cta
.pantry-expiring-section
.pantry-expiring-section__header
.pantry-category-section
.pantry-category-section--collapsed
.pantry-category-section__header
.pantry-category-section__count
.pantry-item-row
.pantry-item-row__name
.pantry-item-row__quantity
.pantry-item-row__expiry-chip
.pantry-item-row__expiry-chip--urgent
.pantry-low-badge
.pantry-add-fab
.pantry-add-sheet
.pantry-autocomplete-dropdown
.pantry-autocomplete-item
.pantry-empty-state
```

### Edge cases

- **Quantity reaches 0:** item is not auto-removed; it stays with a quantity of 0 and `lowThreshold` logic still fires (0 is always low). User must explicitly remove it.
- **Duplicate names:** adding an item with a name that already exists in the pantry prompts "You already have [name] — update the existing entry?" with options "Update" (merges quantity) or "Add separately" (inserts as new row).
- **Missing expiresAt on import:** shopping list items have no expiry data. `expiresAt` is left undefined; user can set it after import by tapping the row.
- **Large pantry (100+ items):** category sections are virtualised using the same windowing approach as LibraryBrowser. The expiring section is always fully rendered (bounded by 7-day window, unlikely to be large).
- **Cook Now with zero matches:** Browse shows the empty-state illustration with copy "Nothing in your pantry matches a recipe yet — try adding more items." The Cook Now pill remains active; tapping it deactivates and resets Browse.
- **pantryItems query string length:** if the pantry exceeds ~200 items the query string may breach URL limits. In that case, POST the pantry list in the request body with `Content-Type: application/json` and keep the `pantryFilter=true` flag as a query param.
- **Category inference failure:** items added via free text with no staple match default to `category: "other"`. The user can re-categorise from the edit sheet at any time.
- **Dark mode:** `--color-warning-subtle` and `--color-warning` have dark-mode values in the existing theme token sheet. The expiring section amber background uses these tokens, so dark mode is handled automatically.

---

## Data & Dependencies

**Reads from:**
- `usePersistentState("tutti.pantry", [], isPantryArray)` — own store
- `useShoppingStore()` — reads `lastCompletedShopping` for the import banner
- `pantryStaples.ts` — static autocomplete data (no network call)

**Writes to:**
- `"tutti.pantry"` localStorage via `usePantry()` hook
- `"tutti.pantryImportDismissed"` localStorage flag (keyed by shopping session ID)

**Consumed by:**
- `ShoppingScreen.tsx` — calls `subtractPantry(lines, pantryItems)` to compute what to buy
- `BrowseScreen.tsx` — reads `usePantry().items` to build the Cook Now query
- `/api/library/recipes` — server route must handle `pantryFilter` + `pantryItems` params (new server-side logic)

**Affected screens / components:**
- `MeTab.tsx` — adds Pantry as a sub-nav destination (alongside Calendar, Meals, Settings)
- `BrowseScreen.tsx` — adds `CookNowPill` to filter row, wires pantry state
- `ShoppingScreen.tsx` — adds "Done" action that sets `lastCompletedShopping` and triggers import banner
- `validators.ts` — `isPantryArray` extended with `category`, `expiresAt`, `lowThreshold`
- `apps/web/src/hooks/usePantry.ts` — extended with new exports and migration logic
- `apps/web/src/data/pantryStaples.ts` — new file
- `packages/engine/src/types.ts` — no changes; `PantryItem` is a web-only type
