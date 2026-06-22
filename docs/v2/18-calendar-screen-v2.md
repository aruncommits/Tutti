# 18 — Calendar Screen V2

## Overview

The Calendar screen is a weekly planner that lets users assign meal plans to specific days, browse what they have coming up, and quickly re-cook a previous meal without re-building the plan from scratch. In V2, Calendar moves from its own bottom tab into the "Me" tab alongside Settings and Meals, reducing tab-bar clutter while keeping the planning surface fully intact. Its core job is to close the loop between planning (Home) and habit — users who schedule meals ahead are more likely to cook, and users who cooked something great can restore it in two taps rather than re-assembling it.

---

## Current State

**File:** `apps/web/src/screens/CalendarScreen.tsx`

- Renders a Mon–Sun grid for the current week.
- Each day cell shows the meal names assigned to that day.
- A day can receive the currently active home plan via an "Assign to [day]" action.
- A per-day shopping list is derivable from the assigned recipes.
- Empty days show a blank cell with no affordance.
- Data is stored in `localStorage` under the key `tutti.calendar` as `Record<string, string[]>`, where each key is an ISO date string (`"2026-06-22"`) and the value is an array of `recipeId` groups — each group represents one meal plan slot.

**What works:**
- Week rendering and day-to-recipe assignment.
- Reading and writing `tutti.calendar` via the shared `calendar` / `setCalendar` state passed down from `App.tsx`.
- Recipe name lookup from `allRecipes` by `recipeId`.

**What is broken or missing:**
- No week navigation (no ← → arrows to move between weeks).
- No bottom sheet for choosing between "Assign tonight's plan" and "Pick a saved meal."
- No quick-restore flow ("Cook this tonight").
- No combined weekly shopping list button.
- Empty cells have no visible prompt or add affordance — the screen reads as empty.
- Today is not visually distinguished from other days.
- The screen lives on its own dedicated bottom tab, which V2 removes.

---

## Problem

From a real user's perspective:

1. **I can only see this week and I can't scroll back.** If I cooked something great last Thursday I have no way to look it up in the calendar — the week is fixed.
2. **Adding a meal to a day is opaque.** There is no visible "add" target. I have to already know the interaction exists.
3. **Re-cooking a previous meal is a four-step rebuild.** I have to go to Home, remember what dishes I used, add them individually, and set the time again. The calendar already stores the plan — it should just restore it.
4. **Planning for the whole week is fragmented.** I have to navigate to Shopping separately and mentally filter for the right days. There is no "what do I need to buy for this whole week" view.
5. **Today looks identical to every other day.** I have to count from Monday to find where I am.

---

## V2 Design

**Calendar moves into the "Me" tab.** It is accessed via a "Calendar" entry inside the Me screen, not a dedicated tab. This preserves the full feature surface while freeing a tab slot.

**Week navigation.** A header row with `‹ This week ›` (or the specific date range, e.g., `Jun 16 – 22`) lets users page backward and forward in one-week increments. The current week is the default landing state. Paging is unbounded — past weeks are readable; future weeks are writable.

**Today highlight.** The column for the current calendar date receives a distinct background tint (`--color-today-tint`, a low-opacity accent) so orientation is instant.

**Empty-state chip.** Every empty day cell shows a small inline chip: `Nothing planned · +Add`. Tapping it opens the same bottom sheet as the explicit day-tap action. This makes the screen self-explanatory for new users and removes the discoverability problem.

**Assignment bottom sheet.** Tapping any day (empty or not) opens a bottom sheet with two actions:
- **Assign tonight's plan** — only shown if the user has an active plan on the Home screen (i.e., `homePlan.recipes.length > 0`). Writes the current plan's recipe IDs to the tapped date in `calendar`.
- **Pick a saved meal** — opens a flat scrollable list of previously assigned meals (distinct plan fingerprints, most recent first) plus any named collections from the Studio screen. Selecting one writes that plan's recipe IDs to the tapped date.

The bottom sheet is dismissible via swipe-down or backdrop tap.

**Quick-restore ("Cook this tonight").** Tapping a day cell that already has meals assigned opens the same bottom sheet but with a third option at the top: **Cook this tonight** (shown in accent color). This loads the stored recipe IDs into the Home plan and navigates to the Home screen, where the user can adjust serve time and hit Build Plan. This closes the re-cook loop in two taps.

**Weekly shopping list.** A sticky footer button — `Shopping for the week` — is always visible at the bottom of the Calendar screen. It aggregates the ingredient lists for all recipe IDs assigned across all days of the currently displayed week and opens the Shopping screen pre-filtered to that combined list. If the week has no assigned meals the button is disabled with label `No meals planned this week`.

**No drag-reschedule in V2.** Rescheduling by drag-and-drop is deferred. The interaction cost of implementing accessible, mobile-friendly drag is high relative to the benefit at current user scale. A future phase can add it once the core planning habit is established.

---

## Spec

### Component tree

```
CalendarScreen
├── CalendarHeader          # week label + prev/next arrows
├── WeekGrid                # horizontal scroll container (7 columns)
│   └── DayColumn × 7      # one per day Mon–Sun
│       ├── DayHeading      # "Mon 16" label, today variant
│       ├── MealChip × n    # one per assigned meal slot
│       └── EmptyDayChip    # "Nothing planned · +Add", hidden when meals exist
├── WeekShoppingButton      # sticky footer CTA
└── AssignDaySheet          # bottom sheet, conditionally rendered
    ├── CookTonightRow      # only when day has existing meals
    ├── AssignTonightRow    # only when homePlan is non-empty
    └── SavedMealsList      # scrollable list of past plan fingerprints
```

### CalendarScreen props / state

```ts
interface CalendarScreenProps {
  calendar: Record<string, string[][]>;  // ISO date → array of meal-plan groups
  setCalendar: (c: Record<string, string[][]>) => void;
  allRecipes: RecipeGraph[];
  homePlan: { recipeIds: string[]; serveTime: Date | null };
  onRestorePlan: (recipeIds: string[]) => void;  // loads IDs into home plan, navigates home
  onOpenShopping: (recipeIds: string[]) => void; // opens shopping screen with given recipe set
  collections: Collection[];                      // from Studio state
}

interface CalendarScreenState {
  weekOffset: number;          // 0 = current week, -1 = last week, +1 = next week
  selectedDate: string | null; // ISO date of the day whose sheet is open
}
```

### Data shape clarification

The existing `calendar` type is `Record<string, string[]>` (flat array of recipeIds per day). V2 promotes the value to `string[][]` — an array of meal-plan groups — so a day can hold more than one meal (e.g., lunch and dinner). Migration: on read, if a stored value is a flat `string[]` where the first element is not itself an array, wrap it: `[existingArray]`. This is a non-breaking upgrade.

### Week computation

```ts
// weekOffset 0 → Mon–Sun of the current ISO week
function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const monday = startOfISOWeek(today);          // date-fns or manual Sunday→Monday shift
  monday.setDate(monday.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10); // "2026-06-22"
}
```

No external date library is required — the computation is simple enough with native `Date`.

### CalendarHeader

```tsx
<header className="calendar-header">
  <button className="week-nav" onClick={() => setWeekOffset(w => w - 1)} aria-label="Previous week">‹</button>
  <span className="week-label">{weekLabel}</span>  {/* "Jun 16 – 22" or "This week" when offset === 0 */}
  <button className="week-nav" onClick={() => setWeekOffset(w => w + 1)} aria-label="Next week">›</button>
</header>
```

`weekLabel`: when `weekOffset === 0`, render "This week"; otherwise render the date range string `"Jun 16 – 22"`.

### WeekGrid + DayColumn

```tsx
<div className="week-grid" role="grid">
  {weekDates.map(date => {
    const iso = toISODate(date);
    const mealGroups: string[][] = calendar[iso] ?? [];
    const isToday = iso === toISODate(new Date());
    return (
      <DayColumn
        key={iso}
        date={date}
        mealGroups={mealGroups}
        isToday={isToday}
        allRecipes={allRecipes}
        onDayTap={() => setSelectedDate(iso)}
      />
    );
  })}
</div>
```

**DayColumn** renders:
- `DayHeading`: `"Mon"` on top, `"16"` below. When `isToday`, wraps in `<span className="today-badge">`.
- For each `mealGroup` in `mealGroups`: a `MealChip` showing the comma-joined recipe names (looked up from `allRecipes` by ID). If a name is not found, fall back to `"Unknown recipe"`.
- When `mealGroups.length === 0`: an `EmptyDayChip` with text `"Nothing planned"` and a `+` icon button. Tapping either the chip or the `+` triggers `onDayTap`.

### MealChip

```tsx
<button className="meal-chip" onClick={onDayTap} aria-label={`Edit meal for ${dayLabel}`}>
  {recipeNames.join(', ')}
</button>
```

Chips are full-width within the column. Long names truncate with `text-overflow: ellipsis`. Max 2 lines before truncation.

### EmptyDayChip

```tsx
<button className="empty-day-chip" onClick={onDayTap}>
  Nothing planned <span className="add-icon">+</span>
</button>
```

Styled as a dashed-border ghost chip, muted color, smaller font than `MealChip`.

### AssignDaySheet

Opens when `selectedDate !== null`. Props:

```ts
interface AssignDaySheetProps {
  date: string;                     // ISO date being edited
  existingMealGroups: string[][];   // current meals on this day
  homePlan: { recipeIds: string[] };
  collections: Collection[];
  pastPlans: PastPlan[];            // derived: distinct plan fingerprints from calendar history
  allRecipes: RecipeGraph[];
  onAssignTonight: () => void;
  onCookTonight: (recipeIds: string[]) => void;
  onPickSavedMeal: (recipeIds: string[]) => void;
  onClose: () => void;
}
```

**Rows (in order):**
1. **Cook this tonight** — only rendered when `existingMealGroups.length > 0`. Shows the meal names of the first meal group. Accent color. On tap: calls `onCookTonight(existingMealGroups[0])` then closes sheet.
2. **Assign tonight's plan** — only rendered when `homePlan.recipeIds.length > 0`. Shows preview of home plan recipe names. On tap: writes home plan IDs as a new group to `calendar[date]` then closes.
3. **Pick a saved meal** section header, then a scrollable `SavedMealsList`.

**SavedMealsList** entries are derived from `pastPlans` (see Data section). Each entry shows recipe names. Tapping one writes those IDs as a new group to `calendar[date]` then closes.

**Dismiss:** swipe-down gesture (CSS `overscroll-behavior`) or tap outside the sheet. Sheet is rendered in a portal at the `#sheet-root` div to avoid stacking context issues.

### WeekShoppingButton

```tsx
<footer className="calendar-footer">
  <button
    className="week-shopping-btn"
    disabled={weekRecipeIds.length === 0}
    onClick={() => onOpenShopping(weekRecipeIds)}
  >
    {weekRecipeIds.length === 0
      ? 'No meals planned this week'
      : 'Shopping for the week'}
  </button>
</footer>
```

`weekRecipeIds` is computed by flattening all `mealGroups` for all days in the current `weekDates` set, deduplicating by `recipeId`.

### CSS classes (new)

| Class | Purpose |
|---|---|
| `.calendar-header` | Flex row, space-between, sticky top |
| `.week-nav` | Icon button, 44 × 44 px tap target |
| `.week-label` | Center-aligned heading, `font-size: var(--text-lg)` |
| `.week-grid` | Horizontal flex, 7 equal columns, overflow-x auto on narrow viewports |
| `.day-column` | Flex column, `flex: 1`, min-width 44 px, padding 4 px |
| `.day-heading` | Small label, `font-size: var(--text-xs)`, centered |
| `.today-badge` | `background: var(--color-today-tint)`, border-radius token, extends to full column height via parent |
| `.meal-chip` | Full-width button, `background: var(--color-surface-2)`, rounded, 2-line clamp |
| `.empty-day-chip` | Full-width button, `border: 1px dashed var(--color-border)`, muted text |
| `.assign-sheet` | Bottom-sheet container, `position: fixed`, bottom 0, full width, `border-radius` top corners |
| `.cook-tonight-row` | Accent-colored action row |
| `.assign-tonight-row` | Standard action row |
| `.saved-meals-list` | Scrollable list, max-height 50 vh |
| `.calendar-footer` | Sticky footer, `position: sticky`, bottom 0, background white/dark |
| `.week-shopping-btn` | Full-width primary button, disabled state muted |

### Theme token

```css
:root[data-theme="light"] {
  --color-today-tint: rgba(var(--accent-rgb), 0.08);
}
:root[data-theme="dark"] {
  --color-today-tint: rgba(var(--accent-rgb), 0.14);
}
```

The tint is intentionally subtle — recognition, not alarm.

### Navigation integration

CalendarScreen is no longer a top-level tab. It is reached via the Me screen:

```tsx
// MeScreen.tsx
<MenuRow icon={<CalendarIcon />} label="Calendar" onTap={() => navigate('calendar')} />
```

`navigate('calendar')` sets `screen = 'calendar'` in App.tsx state. Back navigation from CalendarScreen returns to `'me'` (the Me tab), using the `prevScreen` tracking already established in App.tsx.

### Edge cases

| Case | Behavior |
|---|---|
| Recipe in calendar no longer in `allRecipes` | Display `"Deleted recipe"` in chip, still allow assignment and shopping list generation (no crash) |
| Home plan is empty when sheet opens | `Assign tonight's plan` row is hidden entirely |
| Day in the past (any `weekOffset < 0`) | Allow read and assignment — users backfill or correct history |
| Calendar key collision (same ISO date, multiple taps) | Each `AssignDaySheet` action appends a new group to the existing array; does not overwrite |
| Very long recipe names | Chip truncates at 2 lines with `…`; full name visible as native `title` attribute |
| Week with all days empty | Footer button disabled; each column shows `EmptyDayChip`; no blank white void |
| `weekOffset` very large (distant future/past) | No cap — calendar data is sparse; missing keys = empty days, no fetch required |

---

## Data & Dependencies

### Data sources

| Key | Storage | Shape | Owner |
|---|---|---|---|
| `tutti.calendar` | `localStorage` | `Record<string, string[][]>` | App.tsx `calendar` state |
| `allRecipes` | IndexedDB `recipeStore` + `tutti.candidates` | `RecipeGraph[]` | App.tsx `allRecipes` derived state |
| Home plan recipe IDs | App.tsx `homePlan` state | `string[]` | Home screen writes, Calendar reads |
| Collections | App.tsx / Studio state | `Collection[]` | Studio screen writes, Calendar reads for `SavedMealsList` |

### Derived data: `pastPlans`

Built inside `CalendarScreen` from the full `calendar` record (all dates, not just the current week):

```ts
const pastPlans: PastPlan[] = useMemo(() => {
  const seen = new Set<string>();
  const plans: PastPlan[] = [];
  Object.entries(calendar)
    .sort(([a], [b]) => b.localeCompare(a))  // most recent date first
    .forEach(([, groups]) => {
      groups.forEach(group => {
        const key = [...group].sort().join(',');
        if (!seen.has(key)) {
          seen.add(key);
          plans.push({ recipeIds: group });
        }
      });
    });
  return plans;
}, [calendar]);
```

This gives the `SavedMealsList` a de-duplicated history of every distinct meal plan ever assigned, most recent first.

### Screens that touch CalendarScreen

| Screen | Relationship |
|---|---|
| Home | Writes `homePlan`; Calendar reads it for "Assign tonight's plan" |
| Me | Hosts Calendar as a navigable entry; back target |
| Shopping | Receives combined `recipeIds` from "Shopping for the week" button |
| Studio | Provides `collections` for the `SavedMealsList` |

### Packages

- `@tutti/engine` — no direct dependency; recipe lookup is by ID against `allRecipes` (already resolved)
- No new npm dependencies — date arithmetic uses native `Date`; bottom sheet uses CSS + state, not a library
- `localStorage` key `tutti.calendar` must be read/written with the existing `useLocalStorage` hook pattern (or equivalent) already used across the app
