# 16 — Mise Screen V2

## Overview

The Mise screen (labelled "Get ready" in the UI) is the preparation gate between planning and cooking. It appears after the user finalises their plan on the Preview screen and before the live Cook screen begins. Its purpose is to ensure the cook has gathered everything they need — ingredients in the right amounts, equipment in hand, and any notes from previous attempts — so the cooking session starts without interruption. The name "mise en place" is the culinary term for this practice; the UI label "Get ready" is used because it communicates the intent to non-professionals without explanation.

## Current State

**File:** `apps/web/src/screens/MiseScreen.tsx`

**What exists today:**
- "Get ready" heading with a subtitle
- Ingredient list: checkable rows showing colour dot (via `kindColorOf` from `ingredientColor.tsx`), ingredient name, and amount — this is working and correct
- Equipment section: lists equipment nodes from the recipe graph; shows a "Heads up" paragraph when kitchen config is missing items
- "Last time" section: shows previous cook notes and star rating if stored; photo display is implemented via `photos[recipeId]` lookup
- "Start cooking" button navigates to the cook screen
- No back button to Preview is shown (navigation relies on browser history or the tab bar)
- No progress indicator communicating where this step sits in the cook flow
- No "Check all" affordance per section — each item must be checked individually
- The "Last time" section renders after the Gather and Equipment sections, meaning context from a previous cook is shown last rather than first

**Related files:**
- `apps/web/src/screens/PreviewScreen.tsx` — previous screen in the linear flow
- `apps/web/src/screens/CookScreen.tsx` — next screen after "Start cooking"
- `apps/web/src/ingredientColor.tsx` — `kindColorOf(name)` and `KIND_LABEL`
- `packages/engine/src/types.ts` — `RecipeGraph`, node types
- `apps/web/src/state.ts` — `Screen` union type; `ready` is the current state name for this screen
- `apps/web/src/App.tsx` — screen dispatch and `prevScreen` ref

**What is broken or missing:**
- No back navigation to Preview
- No flow progress indicator
- Missing equipment renders as plain paragraph text — not visually distinct enough to catch attention
- "Last time" section is at the bottom, below the gather lists, which means prior-cook context is easy to miss
- No way to check an entire section at once; on a complex multi-dish meal this means tapping 20+ individual rows

## Problem

From a real user's perspective:

1. **No orientation.** The screen appears with no indication of where you are in the cook flow. Is this the last step before cooking? Is there something after Cook? Users have to guess.

2. **Missing equipment is easy to miss.** When a recipe needs a wok and the user's kitchen profile does not list one, the current plain paragraph blends into the content. On a phone screen, a user scanning quickly will miss it and only discover the problem mid-cook.

3. **Prior cook context arrives too late.** If a user made this dish before and noted "reduce salt," that note is buried at the bottom after a long checklist. It should surface first so the cook can act on it while gathering.

4. **Checking 20 ingredients one by one is tedious.** A user who already knows they have everything still has to tap each row to feel the satisfaction of completion — or just ignores the checklist entirely.

5. **No back button.** If the user wants to go back and adjust the serve time or reorder steps on Preview, there is no obvious path. They must either know the tab bar trick or restart.

6. **No acknowledgement when starting.** Tapping "Start cooking" transitions instantly with no feedback, which can feel like the tap did not register on slower devices or when the cook screen takes a moment to initialise.

## V2 Design

**Progress indicator.** Add a three-step flow label at the top of the screen: `Step 1 of 3 — Get ready`. The three steps are Get ready → Cook → Done. This gives users orientation and a sense of forward momentum. The label is small, muted, and sits above the main heading — it should not compete with the page title.

**Back button.** Add an explicit back chevron (←) in the top-left corner. MiseScreen is always entered from PreviewScreen, so the back target is always `preview`. No dynamic origin tracking is needed; a direct `setScreen('preview')` call is sufficient. The `prevScreen` ref in App.tsx can be used as a guard if needed but the flow is linear enough to hard-code this.

**"Last time" section moves to the top.** Reorder sections so prior-cook context (notes, rating, and photo if available) appears immediately after the progress indicator and heading, before any gather or equipment lists. A user re-cooking a dish they have made before sees their own notes first. First-time cooks see nothing in this slot and the section is hidden, so there is no visual gap.

**Missing equipment: yellow banner card.** Replace the plain paragraph with a visually distinct card. Use a yellow/amber background (`--color-warn-bg`), a warning icon (⚠), bold first line naming the missing items, and a softer second line: "Check you have these before starting." The card sits at the top of the Equipment section, above the equipment checklist rows.

**Check all button per section.** Each section header (Ingredients, Equipment) gains a `Check all` link/button aligned to the right of the heading. Tapping it marks every unchecked row in that section as checked. If all are already checked, it toggles to `Uncheck all`. This is a convenience affordance — it does not affect whether "Start cooking" is enabled (the button is always enabled).

**Completion animation.** When "Start cooking" is tapped, apply a brief scale-up then scale-down animation to the button (`transform: scale(1.06)` over 120 ms, then back to `scale(1)` over 80 ms) before navigating. This uses a CSS class `btn--tap-burst` added in the click handler, with an `animationend` listener that triggers the screen transition. On slow devices this provides tactile confirmation; the animation is short enough that it does not feel like a delay.

**Label: "Get ready" stays in the UI.** The heading remains "Get ready." "Mise en place" is used only in code comments, component names, and documentation to avoid alienating non-professional cooks.

## Spec

### Component

**File:** `apps/web/src/screens/MiseScreen.tsx`

**Props (from App.tsx screen dispatch):**
```
plan: MasterExecutionPlan
recipes: RecipeGraph[]
kitchen: Kitchen
photos: Record<string, string>          // recipeId → data URL or blob URL
cookHistory: Record<string, CookRecord> // recipeId → { notes, rating, date }
onStart: () => void                     // navigate to CookScreen
onBack: () => void                      // navigate to PreviewScreen
```

### Section Order (top to bottom)

1. Progress label
2. Page heading
3. "Last time" section (hidden if no history for any recipe in the plan)
4. Missing equipment banner (hidden if no gaps)
5. Ingredients section (with Check all)
6. Equipment section (with Check all)
7. "Start cooking" button

### Progress Label

```tsx
<p className="mise-progress-label">Step 1 of 3 — Get ready</p>
```

CSS:
```css
.mise-progress-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: var(--space-1);
}
```

### Back Button

```tsx
<button className="mise-back-btn" onClick={onBack} aria-label="Back to preview">
  ← Preview
</button>
```

Positioned in the top-left corner using `position: absolute` within the screen header area, or as the first element in a flex row with the progress label on the right. Matches the style of back buttons on other screens (`btn--ghost btn--sm`).

### "Last time" Section

Condition: rendered only when at least one `recipeId` in `plan` has an entry in `cookHistory`.

For each recipe with history:
- Recipe name as sub-heading
- Star rating (read-only `★` glyphs, `--color-star` fill)
- Notes text (truncated to 4 lines with `line-clamp: 4`; "Show more" expands inline)
- Photo: if `photos[recipeId]` exists, render `<img>` with `object-fit: cover`, max-height 160 px, border-radius `var(--radius-md)`. Photo renders above the notes text.

```tsx
<section className="mise-section mise-section--last-time">
  <h2 className="mise-section-heading">Last time</h2>
  {recipesWithHistory.map(recipe => (
    <LastTimeTile
      key={recipe.recipeId}
      recipe={recipe}
      record={cookHistory[recipe.recipeId]}
      photo={photos[recipe.recipeId]}
    />
  ))}
</section>
```

**`LastTimeTile` component** (co-located in `MiseScreen.tsx` or extracted to `components/LastTimeTile.tsx` if reused elsewhere):
- Props: `recipe: RecipeGraph`, `record: CookRecord`, `photo?: string`
- No interactivity; purely display

### Missing Equipment Banner

Compute missing equipment:
```ts
const kitchenEquipment = new Set(kitchen.equipment ?? [])
const allEquipment = plan.recipes.flatMap(r =>
  r.nodes.filter(n => n.type === 'equipment').map(n => n.label)
)
const missing = [...new Set(allEquipment)].filter(e => !kitchenEquipment.has(e))
```

When `missing.length > 0`:
```tsx
<div className="mise-warn-banner" role="alert">
  <span className="mise-warn-icon" aria-hidden="true">⚠</span>
  <div>
    <strong>Heads up — you may need: {missing.join(', ')}</strong>
    <p>Check you have these before starting.</p>
  </div>
</div>
```

CSS:
```css
.mise-warn-banner {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  background: var(--color-warn-bg);   /* amber-50 equivalent */
  border: 1px solid var(--color-warn-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
}
.mise-warn-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 1px;
}
```

Tokens to add to `theme.css` if not already present:
```css
--color-warn-bg: #fffbeb;
--color-warn-border: #fde68a;
```

Dark theme overrides:
```css
[data-theme="dark"] {
  --color-warn-bg: #292200;
  --color-warn-border: #713f12;
}
```

### Ingredients Section with Check all

State:
```ts
const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
```

Key per ingredient row: `${recipeId}::${nodeId}`.

Section header:
```tsx
<div className="mise-section-header">
  <h2 className="mise-section-heading">Ingredients</h2>
  <button
    className="mise-check-all-btn"
    onClick={() => handleCheckAll('ingredients')}
  >
    {allIngredientsChecked ? 'Uncheck all' : 'Check all'}
  </button>
</div>
```

`handleCheckAll('ingredients')` logic:
```ts
const allKeys = ingredientRows.map(r => r.key)
const allChecked = allKeys.every(k => checkedIngredients.has(k))
if (allChecked) {
  setCheckedIngredients(prev => {
    const next = new Set(prev)
    allKeys.forEach(k => next.delete(k))
    return next
  })
} else {
  setCheckedIngredients(prev => new Set([...prev, ...allKeys]))
}
```

Ingredient row (existing implementation — keep as-is):
```tsx
<label className={`mise-ingredient-row ${checked ? 'mise-ingredient-row--checked' : ''}`}>
  <input type="checkbox" checked={checked} onChange={() => toggleIngredient(key)} />
  <span
    className="mise-ingredient-dot"
    style={{ backgroundColor: kindColorOf(ingredient.name) }}
    aria-hidden="true"
  />
  <span className="mise-ingredient-name">{ingredient.name}</span>
  <span className="mise-ingredient-amount">{ingredient.amount}</span>
</label>
```

When checked: apply `opacity: 0.5` and `text-decoration: line-through` to name and amount.

### Equipment Section with Check all

Same pattern as ingredients. Separate state:
```ts
const [checkedEquipment, setCheckedEquipment] = useState<Set<string>>(new Set())
```

Equipment rows do not have a colour dot. Layout: checkbox + equipment name only.

### "Start cooking" Button

```tsx
<button
  ref={startBtnRef}
  className="btn btn--primary btn--lg mise-start-btn"
  onClick={handleStart}
>
  Start cooking
</button>
```

Handler:
```ts
const handleStart = () => {
  const btn = startBtnRef.current
  if (!btn) { onStart(); return }
  btn.classList.add('btn--tap-burst')
  btn.addEventListener('animationend', () => onStart(), { once: true })
}
```

CSS animation:
```css
@keyframes tap-burst {
  0%   { transform: scale(1); }
  60%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}
.btn--tap-burst {
  animation: tap-burst 200ms ease-out forwards;
}
```

The button is always enabled regardless of checkbox state. Do not gate on "all checked" — the checklist is a convenience tool, not a gate.

### Accessibility

- The missing equipment banner uses `role="alert"` so screen readers announce it on mount
- Checkboxes use `<label>` wrapping for tap-target size (min 44 × 44 px)
- "Check all" / "Uncheck all" button has an `aria-label` that includes the section name: `aria-label="Check all ingredients"`
- Back button has `aria-label="Back to preview"`
- Progress label is not announced as a landmark; it is plain `<p>` text

### Layout Structure

```
.mise-screen
  .mise-header
    button.mise-back-btn
    p.mise-progress-label
  h1.mise-heading          "Get ready"
  section.mise-section--last-time   (conditional)
  div.mise-warn-banner               (conditional)
  section.mise-section--ingredients
    .mise-section-header
    .mise-ingredient-list
  section.mise-section--equipment
    .mise-section-header
    .mise-equipment-list
  .mise-footer
    button.btn--primary.mise-start-btn
```

`.mise-screen` uses `display: flex; flex-direction: column` with the footer pinned to the bottom using `margin-top: auto` on `.mise-footer`, so the "Start cooking" button stays at the bottom on short content and scrolls naturally on long content.

## Data & Dependencies

| Data | Source | Notes |
|------|--------|-------|
| `MasterExecutionPlan` | Computed by `compile()` in PreviewScreen, passed down | Contains the full recipe list and schedule |
| `RecipeGraph[]` | Extracted from the plan or passed separately | Used for node traversal (ingredient + equipment nodes) |
| `Kitchen` | App-level state (localStorage `tutti.kitchen`) | Needed to compute missing equipment |
| `photos` | App-level state (`photos` map, keyed by `recipeId`) | Blob URLs or data URLs; already implemented |
| `cookHistory` | App-level state (`cookHistory` map) | Notes + rating from previous cooks; already implemented |
| `kindColorOf` | `apps/web/src/ingredientColor.tsx` | Pure function — no import side-effects |
| `KIND_LABEL` | Same file | Not needed on MiseScreen itself; used in legend elsewhere |

**Screens that touch MiseScreen:**
- `PreviewScreen` → navigates to `ready` (current state name) → MiseScreen renders; back button returns to `preview`
- `CookScreen` → entered when "Start cooking" fires `onStart()`; no data passed at transition time (CookScreen reads the plan from App-level state)

**State machine:**
- Current state name for this screen in `state.ts`: `ready`
- No rename needed — `ready` is correct as an internal identifier
- `Screen` union in `state.ts` already includes `'ready'`; `SCREENS` set in `validators.ts` already includes it

**Tests to update / add (`apps/web/src/screens/MiseScreen.test.tsx`):**
- Renders progress label "Step 1 of 3 — Get ready"
- Renders back button; click calls `onBack`
- Missing equipment banner renders with `role="alert"` when kitchen gaps exist; hidden otherwise
- "Last time" section renders above ingredients section when history exists
- "Check all" checks every ingredient row; second tap unchecks all
- "Start cooking" button is always enabled
- Completion animation class `btn--tap-burst` is added on click before `onStart` is called
