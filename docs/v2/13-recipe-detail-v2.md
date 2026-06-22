# 13 — Recipe Detail Screen V2

## Overview

The Recipe Detail Screen is the primary information view for a single recipe — it surfaces ingredients, steps, nutritional data, and cook history so a user can decide whether to cook a dish and understand exactly how to execute it. It is opened from Browse (catalog preview), Studio (personal library), Home (meal planner), and Calendar, and must return the user to whichever screen launched it. In V2 this screen becomes a more scannable, interaction-friendly surface: the legend moves up to anchor ingredient reading, steps collapse to reduce scroll depth, variant tabs show time estimates at a glance, and the note surfaces above the fold where it informs the user's choice rather than sitting forgotten at the bottom.

---

## Current State

**Primary file:** `apps/web/src/screens/RecipeDetailScreen.tsx`

**Supporting files:**
- `apps/web/src/components/NutritionStrip.tsx` — macro ring display
- `apps/web/src/components/ingredientColor.tsx` — `kindColorOf()`, `KIND_LABEL`
- `apps/web/src/components/ExpandText.tsx` — truncation toggle (exists; not applied to steps)
- `apps/web/src/components/CollectionChips.tsx` — collection membership badges
- `packages/engine/src/types.ts` — `RecipeGraph`, `RecipeNode`, `RecipeEdge`
- `apps/web/src/state.ts` — `Screen` union, `prevScreen` field

**What works today:**
- Name, meta row (total time, servings, tier badge, allergen pills, diet tags)
- `NutritionStrip` with calorie + macro breakdown
- Collections chips showing membership
- Variant tabs (Simple / Standard / Elaborate) switching the active `RecipeGraph`
- Last cook note rendered below meta
- Ingredient list with colored dot per ingredient kind, blend sub-sections with expander chevrons
- `ingredientColor` legend rendered at the bottom of the ingredient section
- Numbered step list with phase label, duration badge, and hands-free tag; `highlightIngredients()` applied per step
- `+ Add to meal` button (fixed bottom bar)
- `Customize` text link, `Back` text link, `Print` text link

**What is broken or missing:**
- Legend sits below the full ingredient list — a user reading ingredients has already scrolled past it before they know what the colors mean
- Steps are always fully expanded — a recipe with 12 steps at 100–200 characters each produces a wall of text with no visual hierarchy
- Variant tab labels are bare tier names ("Simple", "Standard", "Elaborate") with no time signal; the user cannot compare tiers without switching each one individually
- `+ Add to meal` label does not match the identical action's label on Browse cards ("+ Add to tonight's plan"), creating inconsistency
- `Customize` is ambiguous — users in testing read it as "dietary customization" rather than "edit this recipe"
- The cook note (last rating, note text, cook count) renders below the meta row but above ingredients — close enough to the fold on short screens, but the layout priority does not match importance: the note is most useful when deciding whether to cook the dish again, so it should precede the ingredient list
- CSS `@media print` is absent — printing the page dumps nav, buttons, and legend chrome into the printout
- `role="list"` and `aria-label` attributes are missing from ingredient and step lists; color dots have no `aria-hidden`

---

## Problem

From a real user's perspective:

1. **"What do these colors mean?"** — The user sees colored dots next to every ingredient but must scroll past 8–15 ingredients to find the legend. On a phone, the legend is off-screen entirely when the user is reading the top of the list. The color coding is only useful if it is visible while reading.

2. **"This is too much to read."** — A 12-step recipe renders as a continuous block. There is no way to collapse steps already mentally processed or to quickly skim to step 7. The screen requires constant scrolling to find the current position in a long recipe.

3. **"Which version is faster?"** — The three tier tabs show "Simple", "Standard", "Elaborate" but give no time signal. The user must tap each tab and read the meta row to compare durations — three taps to answer one question.

4. **"Add to meal vs. Add to tonight's plan."** — The same action is labelled differently on Browse and Recipe Detail. Users who learned the label from Browse cards are uncertain whether these are different actions.

5. **"I made this before, should I make it again?"** — The cook count, star rating, and personal note exist but sit below a fold that most users never reach on a decision visit (a visit where they are picking dishes, not executing them). The note is most useful before committing to a dish.

6. **"I want to print this."** — Printing the page today includes nav tabs, the sticky button bar, legend chrome, and collection badges — none of which are useful on paper. There is no print stylesheet.

7. **Accessibility gap** — Screen readers announce the ingredient list as an anonymous group; color is used as the only visual differentiator for ingredient kind with no programmatic fallback.

---

## V2 Design

**Legend above ingredients, sticky within section**
The `KIND_LABEL` legend moves to immediately above the ingredient list header. On scroll within the ingredient section it becomes `position: sticky` at the top of the scroll container so it remains visible as the user reads. This is a layout-only change; no data changes.

**Collapsible steps**
Steps ≤ 80 characters are always fully visible. Steps > 80 characters render the first 80 characters with a "…more" inline toggle. `ExpandText` (already built) handles this. The toggle is per-step and persists only for the session. Steps in Cook mode are unaffected — this change applies only to the Recipe Detail view.

**Variant tabs with time estimates**
Tab labels change from `"Simple"` to `"Simple · 25 min"` using the `totalTime` field from each tier's `RecipeGraph`. The time is read from `graph.nodes` total duration at compile time (or a pre-computed `estimatedMinutes` field if available). If a tier is unavailable, the tab is disabled (greyed, `aria-disabled="true"`).

**CTA and link label alignment**
- `+ Add to meal` → `+ Add to tonight's plan` (matches Browse card label exactly)
- `Customize` → `✏️ Make it mine` (unambiguous edit intent)
- `Back` and `Print` labels unchanged

**Note above ingredients**
The cook history block (`YouMadeThis`) moves above the ingredient list, below the meta row. New format: `"You made this 3× · ★★★★☆ · 'add extra garam masala'"` on one line. If the user has never cooked the dish, this slot is empty (no placeholder text, no empty state — just absent).

**Print stylesheet**
`@media print` in `RecipeDetailScreen.module.css` (or a dedicated `print.css` imported by the component) hides: `[data-nav]`, `[data-sticky-bar]`, `.legend`, `.collections-chips`, `.variant-tabs`, `.actions-row`. Shows only: recipe name, meta row (text only, no badges), ingredient list, step list. Page breaks are avoided mid-step with `break-inside: avoid` on each step item.

**Accessibility**
- Ingredient `<ul>` receives `role="list"` (resets Safari list-role suppression from `list-style: none`) and `aria-label="Ingredients for {recipe.name}"`
- Color dots: `<span aria-hidden="true">` wrapper; each ingredient line carries the plain-text kind label as a visually hidden `<span className="sr-only">` so screen readers announce "Garam masala · spice" without seeing the dot
- Step `<ol>` receives `aria-label="Cooking steps for {recipe.name}"`
- Expand toggle button: `aria-expanded` state, `aria-controls` pointing to the collapsible text id

---

## Spec

### Component: `RecipeDetailScreen`

**File:** `apps/web/src/screens/RecipeDetailScreen.tsx`

**Props:**
```ts
interface RecipeDetailScreenProps {
  recipeId: string;
  onBack: () => void;
  onAddToMeal: (recipeId: string) => void;
  onCustomize: (recipeId: string) => void;
}
```

**State:**
```ts
const [activeTier, setActiveTier] = useState<'simple' | 'moderate' | 'complex'>('moderate');
const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
const [graph, setGraph] = useState<RecipeGraph | null>(null);
```

**Tier resolution:** `activeTier` drives which `RecipeGraph` is loaded. Tier graphs are fetched from the server library (`/api/library/recipe?id={recipeId}&tier={activeTier}`) or resolved from the local `recipeStore` if the recipe is personal.

**Sub-components:**

| Component | Location | Change in V2 |
|---|---|---|
| `IngredientLegend` | extracted from inline JSX | moved above `<IngredientList>`, sticky via CSS |
| `IngredientList` | existing | add `role="list"`, `aria-label`, `aria-hidden` on dots, `.sr-only` kind label |
| `StepList` | existing | wrap long steps in `<ExpandText maxChars={80}>` |
| `VariantTabs` | existing | label includes `· {minutes} min` |
| `YouMadeThis` | existing (moved) | render above `<IngredientLegend>` |
| `NutritionStrip` | unchanged | |
| `CollectionChips` | unchanged | |

**`VariantTabs` label computation:**

```ts
function tierLabel(tier: TierKey, graph: RecipeGraph | undefined): string {
  if (!graph) return TIER_DISPLAY[tier];
  const minutes = Math.round(graph.nodes.reduce((sum, n) => sum + (n.durationSeconds ?? 0), 0) / 60);
  return `${TIER_DISPLAY[tier]} · ${minutes} min`;
}

const TIER_DISPLAY = { simple: 'Simple', moderate: 'Standard', complex: 'Elaborate' };
```

If a tier's graph is not available, the tab renders as:
```tsx
<button disabled aria-disabled="true" className="variant-tab variant-tab--disabled">
  {TIER_DISPLAY[tier]}
</button>
```

**CTA sticky bar:**
```tsx
<div data-sticky-bar className="sticky-bar">
  <button className="btn-primary" onClick={() => onAddToMeal(recipeId)}>
    + Add to tonight's plan
  </button>
  <button className="btn-ghost" onClick={() => onCustomize(recipeId)}>
    ✏️ Make it mine
  </button>
</div>
```

**`IngredientLegend` sticky behavior:**
```css
.legend-anchor {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--surface);
  padding: 6px 0;
}
```

The legend anchor sits between the `YouMadeThis` block and the `<IngredientList>`. On scroll it pins below the app header and above the first ingredient row.

**Step collapse — `ExpandText` usage:**
```tsx
{step.instruction.length > 80
  ? <ExpandText maxChars={80} id={`step-${i}`}>{step.instruction}</ExpandText>
  : <span>{step.instruction}</span>
}
```

`ExpandText` already manages `aria-expanded` and `aria-controls`. No new accessibility work needed here beyond confirming `id` is passed.

**`YouMadeThis` format:**
```tsx
// Render only if cookCount > 0
<p className="cook-history">
  You made this {cookCount}×
  {rating && <> · {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</>}
  {note && <> · <em>'{note}'</em></>}
</p>
```

Source: `localStorage` key `tutti.cookHistory.{recipeId}` (same store used by Cook screen end-of-session save).

**Print stylesheet (within `RecipeDetailScreen.module.css`):**
```css
@media print {
  [data-nav],
  [data-sticky-bar],
  .legend-anchor,
  .collections-chips,
  .variant-tabs,
  .actions-row,
  .nutrition-strip {
    display: none !important;
  }

  .step-item {
    break-inside: avoid;
  }

  .recipe-name {
    font-size: 20pt;
    font-weight: bold;
  }

  .meta-row {
    font-size: 11pt;
    color: #000;
  }
}
```

**Screen layout order (top to bottom):**
1. Back link (← label from `prevScreen`)
2. Recipe name (`<h1>`)
3. Meta row: total time · servings · tier badge · allergen pills · diet tags
4. `NutritionStrip`
5. `CollectionChips`
6. `VariantTabs` (with time estimates)
7. `YouMadeThis` (cook count · rating · note) — hidden if no cook history
8. `IngredientLegend` (sticky anchor)
9. `IngredientList` (role="list", aria-label)
10. `StepList` (ol, aria-label, ExpandText for long steps)
11. Print link (text, no icon)
12. `StickyBar` (fixed bottom): "+ Add to tonight's plan" · "✏️ Make it mine"

---

## Data & Dependencies

**Data sources:**

| Data | Source | Key/Endpoint |
|---|---|---|
| Recipe graph (catalog) | Server API | `GET /api/library/recipe?id={id}&tier={tier}` |
| Recipe graph (personal) | IndexedDB `recipeStore` | `recipeId` lookup |
| Cook history (count, rating, note) | `localStorage` | `tutti.cookHistory.{recipeId}` |
| Collection membership | `localStorage` | `tutti.collections` (same as `CollectionChips` reads today) |
| Ingredient color mapping | `ingredientColor.tsx` | `kindColorOf(name)`, `KIND_LABEL` |
| Tier time estimates | Derived from `RecipeGraph.nodes` | sum of `node.durationSeconds` |

**Screens that open Recipe Detail:**
- `BrowseScreen` — via preview modal "View full recipe" button; `prevScreen = 'browse'`
- `HomeScreen` — via meal planner dish chip; `prevScreen = 'home'`
- `StudioScreen` — via personal recipe card; `prevScreen = 'studio'`
- `CalendarScreen` — via day-cell dish; `prevScreen = 'calendar'`

Back navigation reads `prevScreen` from app state (already implemented in `App.tsx` per V2 Decision). The Back link label should reflect the source: "← Browse", "← Home", "← Studio", "← Calendar".

**Screens Recipe Detail opens:**
- `EditRecipeScreen` (via "✏️ Make it mine" → `onCustomize`)
- `HomeScreen` indirectly (via `onAddToMeal` which adds to the active meal plan and returns to Home)

**Components shared with other screens:**
- `ExpandText` — also used in `StudioScreen` description fields
- `NutritionStrip` — also used in Browse preview modal
- `CollectionChips` — also used in Studio recipe cards
- `ingredientColor` / `kindColorOf` — used in Cook screen ingredient panels
- `highlightIngredients()` — used in Cook screen step display; must remain consistent with Recipe Detail rendering so users see the same highlighted text in both contexts

**Engine dependencies:**
- `RecipeGraph` type from `@tutti/engine` — no engine function calls on this screen; the graph is displayed, not compiled
- `compile()` is not called here; time estimates for variant tabs are derived from raw node durations, not a full plan compile

**Tests to update:**
- `apps/web/src/__tests__/RecipeDetailScreen.test.tsx` — add cases for: legend renders before ingredient list in DOM order; step with >80 chars renders ExpandText; step with ≤80 chars renders plain span; variant tab label includes minutes; CTA reads "+ Add to tonight's plan"; YouMadeThis absent when cookCount = 0; `aria-label` on ingredient list and step list; `aria-hidden` on color dot spans
