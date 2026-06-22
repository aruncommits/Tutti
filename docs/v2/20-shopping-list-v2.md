# 20 — Shopping List V2

## Overview

The Shopping List screen converts a set of selected recipes into a consolidated, aisle-grouped grocery list that a user can take to the store. It de-duplicates and sums ingredients across all recipes, subtracts what is already in the pantry, and lets the user check off items as they shop. In V2, the screen gains a source toggle (tonight vs. this week), aisle header icons, a manual add-item field, and a cleaner share/print path. It lives in the Me tab.

## Current State

File: `apps/web/src/screens/ShoppingScreen.tsx`

What exists today:
- Calls `buildShoppingList(recipes)` from `@tutti/engine` with the current `selectedRecipes` array; correctly sums quantities across recipes (2 tbsp ghee + 1 tbsp ghee → 3 tbsp ghee).
- Groups output by aisle category with text-only section headers.
- Renders each `ShoppingItem` as a checkable row; checked state is local component state (not persisted).
- Pantry subtraction: items whose ingredient name matches a pantry entry are either hidden or pre-checked, but the implementation is inconsistent — some items vanish, some remain visible with no indication of why.
- Share button calls `navigator.share` if available; no clipboard fallback when the API is absent (silently fails on desktop).
- Print button triggers `window.print()`; no dedicated `@media print` stylesheet so nav chrome, tab bar, and buttons all print.
- No source toggle — always sources from `selectedRecipes`; if no plan is active, the list is empty with no explanation.
- No manual add-item field.
- No persist of checked state — leaving and returning resets all checkmarks.

Relevant engine export: `packages/engine/src/shopping.ts` — `buildShoppingList(recipes: RecipeGraph[]): ShoppingItem[]`

Relevant types: `ShoppingItem { ingredient: string; quantity: number; unit: string; aisle: AisleCategory }` where `AisleCategory` is a string union.

Pantry data: `usePersistentState("tutti.pantry")` → `PantryItem[]` with `{ name: string; quantity: number; unit: string }`.

Calendar data: `usePersistentState("tutti.meals")` → `MealEntry[]` with `{ date: string; recipeId: string }`.

## Problem

1. When a user navigates to Shopping from the Me tab with no active cook plan, the list is blank — there is no explanation and no way to source from the week's calendar instead.
2. Pantry subtraction is invisible: the user cannot tell whether an item was removed because it is in the pantry or because it was never needed. If the pantry quantity is wrong, there is no way to override.
3. Checked state resets on every visit, so a user who checks off half their cart on the way to the store loses progress when the phone locks and they reopen the app.
4. Sharing fails silently on desktop Chrome and Firefox; the clipboard fallback does not exist.
5. Printing includes the bottom tab bar and action buttons — unusable output.
6. Aisle headers are plain text with no visual landmark; in a noisy store environment, scanning is slow.
7. No way to add a household item (paper towels, specific brand) that is not in any recipe.
8. After a shopping trip, checked items accumulate with no easy way to clear them without unchecking one by one.

## V2 Design

**Source toggle.** A two-segment control at the top switches between "Tonight" (current `selectedRecipes`, same as today) and "This week" (all recipes assigned to calendar days in the current ISO week). The toggle persists in session state so switching tabs and returning does not reset it. If Tonight has no recipes, the toggle defaults to "This week" automatically with an inline hint. If both are empty, a contextual empty state links to Browse and to the meal planner.

**Aisle header icons.** Each aisle section header gets a fixed emoji icon for rapid visual scanning in-store. The icon is decorative but also acts as a scan anchor. The icon set is defined in a static constant so it can be updated without touching render logic.

**Pantry subtraction — transparent.** Items that are fully covered by pantry stock show inline as "✓ You have this" in a muted style and start pre-checked. Items partially covered show the net quantity in the main row and a sub-line "X in pantry". Items at zero net stay visible (not hidden) so the user can always override by unchecking the pantry row. This replaces the current hide-or-pre-check inconsistency.

**Checked state persistence.** Checked state is stored in `localStorage` keyed by a hash of the ingredient name + unit, keyed under `tutti.shopping.checked`. It is cleared when the user taps "Remove checked items" or explicitly clears it. This survives tab switches and phone locks.

**Manual add-item.** A text input + "Add" button at the bottom of the list lets users append free-text items. These are stored in `localStorage` under `tutti.shopping.manual` and appear in an "Other" aisle section at the end. Manual items are not affected by pantry subtraction.

**Share.** `navigator.share({ title: "Shopping list", text: formattedText })` wrapped in a try/catch; on failure (API absent or user cancel) falls back to `navigator.clipboard.writeText(formattedText)` with a toast "Copied to clipboard". The formatted text is plain-text with aisle section headers and checked state stripped (only unchecked items in the shared output).

**Print.** A `@media print` stylesheet hides `.shopping-header`, `.shopping-source-toggle`, `.bottom-tab-bar`, `.shopping-actions`, and `.shopping-manual-input`. Aisle headers render as `<h2>` elements so they print with semantic hierarchy. Checked items print with strikethrough.

**Clear checked.** A "Remove checked items" text link at the bottom, visible only when at least one item is checked, shows a count ("Remove 4 checked items"). Tapping shows a confirmation snackbar with undo for 5 seconds before the items are removed from the `tutti.shopping.checked` store.

## Spec

### Component tree

```
ShoppingScreen
  ShoppingSourceToggle        // "Tonight" | "This week"
  ShoppingList
    AisleSection[]
      AisleSectionHeader      // icon + label
      ShoppingRow[]           // ingredient row
      PantryRow[]             // "✓ You have this" rows
    ManualSection
      ManualRow[]
  ShoppingActions
    ShareButton
    PrintButton
  ManualAddInput              // text field + Add button
  ClearCheckedLink            // conditional, shows count
```

### ShoppingSourceToggle

```tsx
type ShoppingSource = "tonight" | "week";

// Props
interface ShoppingSourceToggleProps {
  value: ShoppingSource;
  onChange: (v: ShoppingSource) => void;
  tonightCount: number;   // number of recipes in tonight's plan
  weekCount: number;      // number of recipes in this week's calendar
}
```

Auto-selects "week" if `tonightCount === 0`. Renders two pill buttons with a sliding indicator. CSS class: `shopping-source-toggle`.

### Aisle icons

```ts
const AISLE_ICONS: Record<AisleCategory, string> = {
  produce:       "🥬",
  meat:          "🥩",
  dairy:         "🧀",
  pantry:        "🥫",
  spice:         "🧂",
  other:         "🛒",
};
```

`AisleCategory` values must match whatever `buildShoppingList` produces; add a unit test if values ever drift.

### ShoppingRow

```tsx
interface ShoppingRowProps {
  item: ShoppingItem;
  pantryNet: number | null;   // null = no pantry match; 0 = fully covered; >0 = partial
  pantryQty: number | null;
  checked: boolean;
  onToggle: () => void;
}
```

Rendering rules:
- `pantryNet === 0`: render as `PantryRow` ("✓ You have this"), pre-checked, muted style (`shopping-row--pantry-covered`).
- `pantryNet > 0`: render quantity as `pantryNet` in the main label; append sub-line "{ pantryQty } in pantry" in muted text.
- `pantryNet === null`: normal row.
- Checked rows: `shopping-row--checked` class; label has `text-decoration: line-through`.
- Tap target minimum 44 × 44 px; checkbox on left, ingredient text + quantity on right.

### Checked state

```ts
// Key: `${item.ingredient}::${item.unit}` (lowercase, trimmed)
// Storage key: "tutti.shopping.checked"
// Value: Set<string> serialized as string[]

function useCheckedItems(): [Set<string>, (key: string) => void, () => void]
```

Hook returns current set, a toggle function, and a clearAll function. Writes to localStorage on every toggle.

### ManualAddInput

```tsx
interface ManualItem { id: string; label: string; }
// Storage key: "tutti.shopping.manual"
```

On "Add": trims input, generates `id = crypto.randomUUID()`, appends to `tutti.shopping.manual`, clears input. Items render in a "Manual additions" section after all aisle sections with a trash icon on each row for removal.

### pantrySubtract utility

```ts
function pantrySubtract(
  items: ShoppingItem[],
  pantry: PantryItem[]
): Array<ShoppingItem & { pantryNet: number | null; pantryQty: number | null }>
```

Match strategy: lowercase trim on `item.ingredient` vs `pantry[].name`. Unit conversion is best-effort for same-unit family (tbsp/tsp); cross-unit mismatches leave `pantryNet = null` rather than silently zeroing. This function lives in `apps/web/src/utils/pantrySubtract.ts` (not in the engine, because unit-conversion heuristics are UI-layer concerns).

### Source resolution

```ts
function useShoppingRecipes(source: ShoppingSource): RecipeGraph[] {
  const { selectedRecipes } = usePlanStore();
  const meals = usePersistentState<MealEntry[]>("tutti.meals", []);
  const { library } = useLibrary();

  if (source === "tonight") return selectedRecipes;

  const weekStart = startOfISOWeek(new Date());
  const weekEnd = endOfISOWeek(new Date());
  const weekIds = meals
    .filter(m => isWithinInterval(parseISO(m.date), { start: weekStart, end: weekEnd }))
    .map(m => m.recipeId);
  return weekIds.flatMap(id => library.find(r => r.recipeId === id) ?? []);
}
```

Date helpers from `date-fns` (already a dependency via the calendar screen).

### Share formatting

```ts
function formatShoppingText(
  aisles: Array<{ label: string; items: ShoppingItem[] }>,
  manual: ManualItem[],
  checked: Set<string>
): string
```

Outputs unchecked items only. Format per aisle:

```
--- Produce ---
2 cups spinach
1 bunch cilantro

--- Dairy ---
200g paneer
```

Manual items appended as `--- Other ---` section if non-empty.

### Print CSS

File: `apps/web/src/screens/ShoppingScreen.print.css` imported inside `ShoppingScreen.tsx`.

```css
@media print {
  .bottom-tab-bar,
  .shopping-source-toggle,
  .shopping-actions,
  .shopping-manual-input,
  .clear-checked-link,
  .app-header { display: none !important; }

  .shopping-row--checked .shopping-row__label { text-decoration: line-through; }

  body { font-size: 14pt; }
  .aisle-section-header { font-size: 16pt; font-weight: bold; margin-top: 1.2em; }
}
```

### Empty states

| Condition | Message | CTA |
|---|---|---|
| Tonight: no plan | "No plan for tonight. Add dishes on Cook tab or switch to This week." | Link to Home/Cook tab |
| Week: no meals planned | "No meals planned this week. Add some on your calendar." | Link to Calendar in Me tab |
| Both empty | "Pick some recipes to get started." | "Browse recipes" → Browse tab |

### Edge cases

- Same ingredient from two recipes with different units (e.g., "200g butter" and "2 tbsp butter"): cannot be summed; render as two separate rows with a unit mismatch indicator (⚠) and a sub-line "From different recipes — check quantities".
- Pantry item name is a substring match but not exact (e.g., pantry has "ghee" and recipe needs "clarified ghee"): no match; render as normal row. Substring matching causes false positives that are worse than misses.
- Very long ingredient names: truncate at 2 lines with ellipsis; full text accessible via long-press tooltip or accessible label.
- `navigator.share` on iOS 14 requires user gesture; the Share button must be a real `<button>` element, not triggered from a `useEffect`.
- Manual items persist across source toggle changes; they always appear regardless of which source is selected.
- "Remove checked items" does not remove manual items even if manually checked — manual items have their own per-item trash icon as the removal path.

## Data & Dependencies

| Data | Source | Notes |
|---|---|---|
| Tonight's recipes | `usePlanStore().selectedRecipes` | `RecipeGraph[]` |
| Week's recipes | `usePersistentState("tutti.meals")` + library lookup | `MealEntry[]` → `RecipeGraph[]` |
| Pantry inventory | `usePersistentState("tutti.pantry")` | `PantryItem[]` |
| Checked state | `localStorage "tutti.shopping.checked"` | Persisted, hook-managed |
| Manual items | `localStorage "tutti.shopping.manual"` | Persisted, hook-managed |
| buildShoppingList | `@tutti/engine` | Already consolidates quantities |
| pantrySubtract | `apps/web/src/utils/pantrySubtract.ts` | New utility, web layer |
| Date range for week | `date-fns` `startOfISOWeek`/`endOfISOWeek` | Already installed |

Screens that open Shopping: Me tab (primary entry), and optionally a "View shopping list" shortcut from the Preview screen after a plan is built.

Screens Shopping links to: Cook/Home tab (empty state CTA), Me tab Calendar section (empty state CTA), Browse (empty state CTA).

Components shared with other screens: `usePersistentState`, `usePlanStore`, bottom tab bar (hidden on print), toast/snackbar system (used for clipboard confirmation and undo-clear).
