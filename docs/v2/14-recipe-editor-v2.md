# 14 — Recipe Editor V2

## Overview

The Recipe Editor is the screen where users customize a recipe to match their kitchen, skill level, or taste. It opens from Studio ("Edit") or RecipeDetail ("Customize") and produces a personal copy of any recipe — whether forking a server catalog entry or editing a recipe the user already owns. Its purpose is to make Tutti's library truly personal: a user who always doubles servings, swaps an ingredient, or skips a step can encode that knowledge once and have the cook engine use it every time.

## Current State

**File:** `apps/web/src/screens/RecipeEditor.tsx` (EditRecipeScreen in `App.tsx` routing)

**Entry points:** Studio screen "Edit" button on a personal recipe; RecipeDetail "Customize" button (available on any recipe).

**What works today:**
- Name field (text input)
- Servings field (number input)
- Flat ingredient list: name + amount + unit, add/remove rows
- Flat step list: instruction textarea, add/remove rows
- Save path: `saveEditedRecipe` in `App.tsx` → `setCandidates` + `recipeStore.put` → recipe appears in Studio
- The saved recipe carries `verified: false`

**What is broken or missing:**
- No distinction between forking a server recipe (`verified: true`) and editing an owned recipe (`verified: false`) — both paths share the same code, so a user who taps "Customize" on a catalog recipe is unknowingly mutating an internal ID that could conflict with the server catalog
- No per-step phase (`prep` / `active` / `passive`) or duration editing in the editor — steps are plain text with no structured data, so the cook engine cannot schedule them correctly until the graph is compiled with defaults
- No step reordering — the only way to reorder is to delete and re-add
- No inline validation feedback — missing name or zero steps silently blocks save or produces a corrupt graph
- No visual context for which recipe is being edited or forked
- `recipeOriginScreen` tracking exists in `App.tsx` but the editor does not always use it on cancel — cancel drops the user to Home

## Problem

From a real user's perspective:

1. **Silent data corruption.** Tapping "Customize" on a catalog recipe edits the same object in localStorage. If the user later clears candidates or the server catalog changes, their customizations are gone or conflated with the original.
2. **Cook engine gets no scheduling data.** Saving a step without a phase or duration means the engine must guess. A user who sets a 45-minute braise as "active" gets a broken timeline.
3. **Can't reorder steps.** If a user wants to move marinating before slicing, they must delete and retype the entire step.
4. **No confirmation of what they are editing.** A user opening the editor from Browse has no visual anchor — they cannot tell if they are creating a new personal version or editing their existing one.
5. **Cancel goes to Home, not back.** A user who changes their mind and cancels loses their navigation context.

## V2 Design

**Fork vs edit distinction.** When `recipe.verified === true`, the editor is in *fork mode*: it clones the recipe, assigns a new `recipeId` with a `-custom` suffix (e.g. `rice-pilaf-moderate-custom`), and saves it as a net-new personal recipe without touching the original. When `recipe.verified === false`, the editor is in *edit mode*: changes overwrite the existing personal recipe in place. This matches user mental models — catalog recipes feel read-only; personal recipes feel owned.

**Visual header banner.** A one-line banner below the screen title tells the user exactly what mode they are in: "Editing your copy" (edit mode, muted style) or "Creating your own version of [original name]" (fork mode, accent style). This removes ambiguity without requiring the user to understand the data model.

**Structured ingredient rows.** Each ingredient row has four fields: name (text), amount (number), unit (select from a fixed list). The ✕ button removes the row. An "+ Add ingredient" button appends a blank row at the bottom. This matches the `RecipeGraph` node shape and lets users make precise substitutions.

**Structured step rows with phase and duration.** Each step row exposes the instruction (textarea), phase (select: `prep` / `active` / `passive`), and duration in minutes (number input). Rows are reorderable with ↑/↓ buttons. Phase and duration are required data for the cook engine to schedule the step correctly; surfacing them in the editor closes the gap between what users intend and what the engine receives.

**Inline validation.** On save attempt, the editor checks: name is non-empty; at least one step exists. Errors appear inline under the offending field — no modal, no toast. The Save button does not disable eagerly (disabling before the user has tried to save is frustrating); it validates on tap.

**Navigation after save.** On save, the app navigates to `recipeOriginScreen.current` — Studio if the user came from Studio, Browse (recipe detail) if they came from Browse. On cancel, the same screen is used. This leverages the tracking already in `App.tsx`.

**Save CTA label.** "Save my version" — signals personal ownership, not just a generic save.

## Spec

### Component

`apps/web/src/screens/RecipeEditor.tsx`

**Props (passed from App.tsx):**
```
recipeToEdit: RecipeGraph          // the recipe being forked or edited
isFork: boolean                    // derived from recipeToEdit.verified === true
onSave: (r: RecipeGraph) => void   // App.tsx saveEditedRecipe
onCancel: () => void               // navigate to recipeOriginScreen.current
```

**Local state:**
```
name: string
servings: number
ingredients: EditIngredientRow[]   // { id: string, name: string, amount: string, unit: string }
steps: EditStepRow[]               // { id: string, instruction: string, phase: 'prep'|'active'|'passive', durationMins: number }
errors: { name?: string, steps?: string }
```

State is initialized from `recipeToEdit` on mount. Each row gets a stable local `id` (nanoid or index-based) for React key stability during reorder.

### Fork ID generation

```ts
function deriveEditedRecipeId(original: RecipeGraph, isFork: boolean): string {
  if (!isFork) return original.recipeId;
  const base = original.recipeId.replace(/-custom$/, '');
  return `${base}-custom`;
}
```

A second fork of the same catalog recipe produces the same `-custom` id, which overwrites the previous personal copy — this is intentional (one personal version per catalog source).

### Header banner

```tsx
<div className={`re-fork-banner ${isFork ? 're-fork-banner--fork' : 're-fork-banner--edit'}`}>
  {isFork
    ? `Creating your own version of "${recipeToEdit.name}"`
    : 'Editing your copy'}
</div>
```

CSS: `re-fork-banner--fork` uses `var(--color-accent)` text on a tinted background; `re-fork-banner--edit` uses `var(--color-text-muted)` on `var(--color-surface-2)`.

### Name field

```tsx
<label className="re-field-label">Recipe name</label>
<input
  className={`re-name-input ${errors.name ? 're-name-input--error' : ''}`}
  value={name}
  onChange={e => setName(e.target.value)}
  placeholder="Give your version a name"
/>
{errors.name && <span className="re-inline-error">{errors.name}</span>}
```

### Servings spinner

```tsx
<label className="re-field-label">Servings</label>
<input type="number" min={1} max={99} className="re-servings-input" value={servings}
  onChange={e => setServings(Math.max(1, Number(e.target.value)))} />
```

### Ingredient rows

Each row rendered by `IngredientRow` sub-component:

```tsx
<div className="re-ingredient-row">
  <input className="re-ing-name" placeholder="Ingredient" value={row.name}
    onChange={e => updateIngredient(row.id, 'name', e.target.value)} />
  <input className="re-ing-amount" type="number" min={0} placeholder="Amt"
    value={row.amount}
    onChange={e => updateIngredient(row.id, 'amount', e.target.value)} />
  <select className="re-ing-unit" value={row.unit}
    onChange={e => updateIngredient(row.id, 'unit', e.target.value)}>
    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
  </select>
  <button className="re-remove-btn" aria-label="Remove ingredient"
    onClick={() => removeIngredient(row.id)}>✕</button>
</div>
```

`UNITS` constant: `['g', 'kg', 'ml', 'L', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'piece', 'slice', 'clove', 'pinch', '']`

`+ Add ingredient` appends `{ id: nanoid(), name: '', amount: '', unit: '' }`.

### Step rows

Each row rendered by `StepRow` sub-component:

```tsx
<div className="re-step-row">
  <div className="re-step-controls">
    <button className="re-step-move" disabled={isFirst}
      onClick={() => moveStep(row.id, -1)} aria-label="Move step up">↑</button>
    <button className="re-step-move" disabled={isLast}
      onClick={() => moveStep(row.id, 1)} aria-label="Move step down">↓</button>
  </div>
  <div className="re-step-fields">
    <textarea className="re-step-instruction" rows={2}
      placeholder="What to do…" value={row.instruction}
      onChange={e => updateStep(row.id, 'instruction', e.target.value)} />
    <div className="re-step-meta">
      <select className="re-step-phase" value={row.phase}
        onChange={e => updateStep(row.id, 'phase', e.target.value)}>
        <option value="prep">Prep</option>
        <option value="active">Active</option>
        <option value="passive">Passive</option>
      </select>
      <input className="re-step-duration" type="number" min={0} placeholder="mins"
        value={row.durationMins}
        onChange={e => updateStep(row.id, 'durationMins', Number(e.target.value))} />
      <span className="re-step-duration-label">min</span>
    </div>
  </div>
  <button className="re-remove-btn" aria-label="Remove step"
    onClick={() => removeStep(row.id)}>✕</button>
</div>
```

`moveStep(id, direction)`: swaps the step at its current index with the adjacent step in `steps` state array. Direction `-1` = up, `+1` = down.

`+ Add step` appends `{ id: nanoid(), instruction: '', phase: 'prep', durationMins: 5 }`.

Steps error banner shown below step list when `errors.steps` is set:
```tsx
{errors.steps && <span className="re-inline-error re-inline-error--steps">{errors.steps}</span>}
```

### Validation

```ts
function validate(): boolean {
  const errs: typeof errors = {};
  if (!name.trim()) errs.name = 'Recipe name is required';
  if (steps.length === 0) errs.steps = 'Add at least one step';
  setErrors(errs);
  return Object.keys(errs).length === 0;
}
```

Called inside `handleSave` before building the `RecipeGraph`.

### Graph assembly on save

```ts
function buildRecipeGraph(): RecipeGraph {
  const newId = deriveEditedRecipeId(recipeToEdit, isFork);
  const nodes: RecipeNode[] = steps.map((s, i) => ({
    id: `step-${i}`,
    label: s.instruction,
    phase: s.phase,
    durationMins: s.durationMins,
    ingredients: [],   // ingredients resolved separately (see below)
  }));
  // Linear edge chain: step-0 → step-1 → … → step-n
  const edges: RecipeEdge[] = steps.slice(0, -1).map((_, i) => ({
    from: `step-${i}`,
    to: `step-${i + 1}`,
  }));
  return {
    recipeId: newId,
    name: name.trim(),
    servings,
    nodes,
    edges,
    verified: false,
    ingredients: ingredients.filter(r => r.name.trim()).map(r => ({
      name: r.name.trim(),
      amount: parseFloat(r.amount) || 0,
      unit: r.unit,
    })),
  };
}
```

Note: the existing `RecipeGraph` type in `packages/engine/src/types.ts` must be checked before finalising field names — the builder above targets the current schema but the exact `ingredients` field location (top-level vs per-node) should match the engine contract.

### Footer actions

```tsx
<div className="re-footer">
  <button className="btn btn--primary re-save-btn" onClick={handleSave}>
    Save my version
  </button>
  <button className="btn btn--ghost re-cancel-btn" onClick={onCancel}>
    Discard changes
  </button>
</div>
```

### CSS classes (new, scoped to `RecipeEditor.module.css` or equivalent)

| Class | Purpose |
|---|---|
| `re-fork-banner` | Mode indicator bar below screen title |
| `re-fork-banner--fork` | Accent colour, fork mode |
| `re-fork-banner--edit` | Muted colour, edit mode |
| `re-name-input` | Large name field |
| `re-name-input--error` | Red border state |
| `re-servings-input` | Compact number spinner |
| `re-ingredient-row` | Horizontal flex row for one ingredient |
| `re-ing-name` | Grows to fill space |
| `re-ing-amount` | Fixed 60px width |
| `re-ing-unit` | Fixed 80px select |
| `re-step-row` | Flex row: controls + fields + remove |
| `re-step-controls` | Vertical stack of ↑/↓ buttons |
| `re-step-fields` | Grows; stacks textarea over meta row |
| `re-step-meta` | Horizontal: phase select + duration input |
| `re-step-instruction` | Full-width textarea |
| `re-step-phase` | Phase dropdown, 110px |
| `re-step-duration` | Duration number, 60px |
| `re-remove-btn` | Small ✕, right-aligned, destructive colour |
| `re-inline-error` | Red small text under field |
| `re-footer` | Sticky bottom, column-flex, gap 8px |

### `isFork` derivation in App.tsx

At the point where App.tsx navigates to `editRecipe`, it must pass `isFork`:

```ts
// App.tsx — openEditRecipe helper
function openEditRecipe(recipe: RecipeGraph) {
  setRecipeToEdit(recipe);
  setCurrentScreen('editRecipe');
  // isFork is derived at render time from recipeToEdit.verified
}
```

The editor derives `isFork` from the prop: `const isFork = recipeToEdit.verified === true`.

## Data & Dependencies

**Reads:**
- `recipeToEdit: RecipeGraph` — provided by App.tsx from either the server catalog cache or `candidates` localStorage
- `RecipeGraph`, `RecipeNode`, `RecipeEdge` types from `packages/engine/src/types.ts`
- `recipeOriginScreen` ref in App.tsx — used by `onCancel` and post-save navigation

**Writes:**
- `saveEditedRecipe(r: RecipeGraph)` in App.tsx → `setCandidates` (localStorage `tutti.candidates`) + `recipeStore.put` (IndexedDB)
- The saved recipe has `verified: false` regardless of source

**Screens that open this screen:**
- `StudioScreen` → Edit button on a personal recipe
- `RecipeDetailScreen` → "Customize" button (available on any recipe, catalog or personal)

**Screens this screen returns to (via `recipeOriginScreen.current`):**
- `studio` if opened from Studio
- `recipe` (RecipeDetail) if opened from Browse or a plan recipe detail

**Engine impact:**
- The `phase` and `durationMins` fields written by this editor are consumed directly by `compile()` in `packages/engine/src/compile.ts` when the user builds a plan including this recipe
- Incorrect or missing values (e.g. `durationMins: 0`) produce a zero-length node in the Gantt — the editor should show a warning (not a block) if duration is 0 and phase is `active` or `passive`: "A 0-minute step won't appear on the timeline"

**Related constants:**
- `UNITS` array — can live in `packages/engine/src/constants.ts` or as a local array in the editor; if shared with the ingest pipeline it should go in the engine package
- `KIND_LABEL` / `kindColorOf` from `ingredientColor.tsx` — not used in the editor itself but the ingredient names entered here will be colour-coded in RecipeDetail and Cook; no action required in the editor
