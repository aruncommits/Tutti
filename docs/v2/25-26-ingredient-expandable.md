I have everything I need. Here are the two documents:

---

# 25 — Ingredient Color Coding

## Overview

The ingredient color coding system classifies every ingredient in a recipe into one of 10 semantic kinds (fresh, spice, fat, dairy, protein, grain, legume, nut, sweet, other) and assigns each kind a distinct hex color. The goal is to make ingredient lists and step text scannable at a glance: a colored dot on each ingredient row tells a cook whether they are reaching for produce, a spice, a fat, etc., without reading the name. The same color appears inline in step text so the visual association carries through from prep into execution.

## Current State

`apps/web/src/ingredientColor.tsx` contains the entire system as four exports:

- `KIND_COLOR: Record<Kind, string>` — 10 hex values tuned for the dark theme (green for fresh, red for spice, amber for fat/liquids, blue for dairy, magenta for protein, wheat-tan for grain, olive for legume, brown for nut, purple for sweet, gray for other).
- `KIND_LABEL: Record<Kind, string>` — human-readable labels ("Fresh", "Spice", "Oil / liquid", etc.).
- `ingredientKind(name): Kind` — classifies a name string. Classification runs in priority order: regex pre-emptions first (FAT, SWEET, FLOUR, LEAVEN, tofu), then an engine lookup via `lookupIngredient(name)` which returns aisle + diet flags, then a name-based fallback regex for items the reference database misses (spelling variants, compound names like "chilli powder", produce names not in the reference).
- `kindColorOf(name): string` — convenience wrapper that returns the hex color directly.
- `highlightIngredients(text): ReactNode` — scans a step instruction string against a pre-built regex (`ING_RE`) covering every key in `ALL_INGREDIENTS` plus the words "oil" and "spices", sorted longest-first so multi-word names win over their parts. Returns an array of plain string fragments and `<span className="ing-hl" style={{ color: kindColorOf(word) }}>` elements. The regex is built once at module load; `lastIndex` is reset before each call to avoid stateful carryover.

**Where colors appear today:**

- `RecipeDetailScreen.tsx` — ingredient list rows: each row has `<span className="ing-dot" style={{ background: kindColorOf(i.name) }} />` before the ingredient name. Steps: each `<span className="recipe-step-title">` wraps `highlightIngredients(...)`. Legend: `<p className="ing-legend">` rendered **below** the ingredient list (after the closing `</div>` of `.ing-sec`), showing only the kinds actually present in that recipe.
- `MiseScreen.tsx` — the Gather section passes `dot={kindColorOf(i.name)}` to the `<Row>` component, which renders the dot inline with the label.
- `CookScreen.tsx` — ingredient chips in the NOW panel use `<span style={{ color: kindColorOf(ing.name) }}>` (foreground color, not background dot). Step text in the NEXT panel is passed through `highlightIngredients(...)` inside `<ExpandText>`.

**What is broken or missing:**

- The legend appears below the ingredient list in `RecipeDetailScreen`. A user scanning the list encounters colored dots before they know what the colors mean.
- The `ing-dot` spans have no `aria-hidden` attribute and no accompanying accessible text. Screen readers will announce the background color or skip the span silently depending on the reader, giving blind users no equivalent signal.
- `highlightIngredients` wraps matches in `<span>` with only an inline `color` style and class `ing-hl`. There is no `aria-label` or role attribute to communicate the kind to screen readers.

## Problem

From a cook's perspective:

1. You see a column of colored dots on the ingredient list but cannot tell what green or red means until you scroll past all ingredients to the legend. The key should precede the list it explains.
2. If you are using a screen reader or have color vision deficiency, the dots convey nothing. There is no text alternative.
3. In CookScreen the ingredient chips use foreground color only; there is no dot shape, so the color difference is the only distinguishing feature — a problem for users with protanopia or deuteranopia where red (spice) and green (fresh) are indistinguishable.

## V2 Design

- Move the legend above the ingredient list in `RecipeDetailScreen`. The legend is a key, not a footnote; it must appear before the data it explains.
- Add `aria-hidden="true"` to every `ing-dot` span and every `ing-hl` span. Pair each ingredient name with a visually hidden `<span className="sr-only">` that reads `(kind-label)` — e.g., "(Spice)" — so screen readers announce "cumin (Spice)" rather than a bare name.
- Keep the palette unchanged; it was tuned for the dark theme and V2 retains that theme.
- No changes to the classification algorithm in V2 scope (this is a pure display change).

## Spec

**Legend placement (RecipeDetailScreen):**

Move the `<p className="ing-legend">` block from after `.ing-sec` to immediately before it, keeping it conditional on `legendKinds.length > 0`. The JSX order becomes: `<h3>Ingredients</h3>` → `<p className="ing-legend">` → `<div className="ing-sec">`.

**Accessible dots (ingredient list rows in RecipeDetailScreen and MiseScreen Row component):**

```tsx
<span className="ing-dot" style={{ background: kindColorOf(i.name) }} aria-hidden="true" />
<span className="sr-only">({KIND_LABEL[ingredientKind(i.name)]})</span>
{i.name}
```

The `sr-only` class must already exist in the stylesheet (it is a standard visually-hidden utility); if not, add it:
```css
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
```

**Accessible inline highlights (highlightIngredients):**

Change the rendered span in `highlightIngredients` from:
```tsx
<span key={key++} className="ing-hl" style={{ color: kindColorOf(word) }}>{word}</span>
```
to:
```tsx
<span key={key++} className="ing-hl" style={{ color: kindColorOf(word) }} aria-label={`${word} (${KIND_LABEL[ingredientKind(word)]})`}>{word}</span>
```
This is the minimum change that gives screen readers the kind without changing visual output. The `aria-label` overrides the element's text content for AT, so "onions (Fresh)" is announced rather than just "onions".

**Legend item markup:**

```tsx
<span className="leg" key={k}>
  <span className="ing-dot" style={{ background: KIND_COLOR[k] }} aria-hidden="true" />
  <span>{KIND_LABEL[k]}</span>
</span>
```

No `aria-hidden` on the outer `<span>` or the label text — the label is already the accessible name for the dot.

**CookScreen chips:** No change to structure in V2. The foreground-color-only approach is acceptable in the NOW panel because ingredient names are already read aloud via the read-aloud feature. If a separate accessibility pass is done, adding a shape or border variant per kind is the right fix, but that is out of V2 scope.

**Files touched:** `apps/web/src/RecipeDetailScreen.tsx`, `apps/web/src/ingredientColor.tsx`, `apps/web/src/MiseScreen.tsx`.

## Data and Dependencies

- `lookupIngredient`, `ALL_INGREDIENTS` from `@tutti/engine` — the engine reference database drives the primary classification path. Any ingredient added to the engine catalog is automatically classifiable without changes to `ingredientColor.tsx`.
- `ingredientColor.tsx` has no runtime data fetches; it is fully synchronous.
- `ING_RE` is built at module import time from `ALL_INGREDIENTS`. If the engine catalog grows at runtime (dynamic import), the regex will not include new names. This is a known limitation; it is acceptable because the catalog is currently bundled.
- Test coverage: `apps/web/src/ingredientColor.test.tsx` covers `ingredientKind` classifications and `highlightIngredients` span output. The V2 aria changes to `highlightIngredients` will require updating the test assertions for the rendered `aria-label` attribute.
- `RecipeDetailScreen` is reached from Browse (server recipe preview → full screen), Studio (personal recipe detail), and Home (cook-mode entry). The legend move affects all three entry paths identically.
- `MiseScreen` is a sub-screen of CookScreen and is not independently navigable.

---

# 26 — Expandable Pattern

## Overview

`Expandable.tsx` provides two exports — `ExpandText` and `useAccordion` — that implement a consistent "tap to reveal full text" pattern used across screens where step instructions or long labels would overflow their container. The component renders text clamped to a fixed number of lines with a caret toggle; the hook manages mutual exclusion so opening one item in a list automatically closes the previously open one. Together they handle the most common mobile reading pattern: scan collapsed summaries, tap to read the one you care about.

## Current State

`apps/web/src/Expandable.tsx` (36 lines):

**`useAccordion()`** — hook with internal `useState<string | null>(null)`. Returns:
- `isOpen(key: string): boolean` — true when this key is the currently open item.
- `toggle(key: string)` — if `key` is already open, sets state to `null` (closes); otherwise sets state to `key` (opens it, implicitly closing the previous).

This is a pure single-open model. There is no multi-open variant in the file.

**`ExpandText`** — controlled component. Props:
- `text: ReactNode` — the full content (plain string or JSX, including the output of `highlightIngredients`).
- `open: boolean` — whether this instance is expanded (driven by the parent, typically via `useAccordion`).
- `onToggle: () => void` — callback to flip state (parent calls `acc.toggle(key)`).
- `clamp?: 1 | 2 | 3` — CSS line-clamp count when collapsed. Defaults to 2.
- `className?: string` — appended to the button's class list.

Renders as a `<button type="button">` with:
- Class `expandable` (plus `open` when expanded, plus any passed `className`).
- `aria-expanded={open}` on the button itself.
- Inner `<span>` containing `text`, with class `clamp clamp-{clamp}` when collapsed and no class when open.
- A `<span className="expandable-caret" aria-hidden="true">` showing `▾` when open, `▸` when closed.

**Where it is used today:**

- `PreviewScreen.tsx` — "Your order" step reorder section. A single `useAccordion()` instance (`acc`) is shared across all reorder rows. Each step node renders `<ExpandText text={highlightIngredients(n.instruction ?? n.title)} open={acc.isOpen(n.nodeId)} onToggle={() => acc.toggle(n.nodeId)} />` with default `clamp={2}`. This means reading a step and reordering it are the same tap target.
- `CookScreen.tsx` — NEXT panel (upcoming steps). A `useAccordion()` instance named `nextAcc` is scoped to the NEXT list. Each next-step renders `<ExpandText ... clamp={1} />` — single-line clamp because the NEXT panel is compact and only needs a glimpse of the step text.
- `RecipeDetailScreen.tsx` — steps do **not** currently use `ExpandText`. Each step is rendered as `<span className="recipe-step-title">{highlightIngredients(...)}</span>` with no truncation, so long steps overflow their list item.

**What is broken or missing:**

- `RecipeDetailScreen` steps are untruncated. On a long recipe (8–12 steps), the steps section can be taller than the ingredients section despite being lower-priority content on a static view screen. Users who want to scan the structure must scroll through wall-of-text steps.
- There is no character-count-based threshold in `ExpandText` — the caller decides whether to use the component at all. If `RecipeDetailScreen` wraps all steps unconditionally, short 3-word steps ("Serve hot") get a caret button that expands to nothing new, which is confusing.
- The caret symbols (`▸` / `▾`) are not symmetric with each other (right-pointing vs. down-pointing) which subtly suggests directional navigation rather than expand/collapse.
- The button role is correct (`type="button"`) but the accessible name is just the clamped text — screen readers announce "Soak the dried red…" as a button with no indication that it is expandable beyond `aria-expanded`.

## V2 Design

- `RecipeDetailScreen` steps should use `ExpandText` for any step whose instruction text exceeds 80 characters. Steps at or below 80 characters render as plain text (no button, no caret) to avoid pointless interactivity on short steps.
- `useAccordion` remains single-open for `RecipeDetailScreen` steps, consistent with PreviewScreen and CookScreen. This keeps the reading experience linear: open a step, read it, tap another.
- No new multi-open variant is introduced in V2. If a future screen needs multi-open (e.g., a FAQ list), the pattern is `useState<Set<string>>` with a local toggle — callers should not reach for `useAccordion` for that use case.
- The 80-character threshold is a caller-side concern, not an `ExpandText` concern. `ExpandText` itself does not change. The threshold lives in `RecipeDetailScreen`.

## Spec

**Threshold helper (add to RecipeDetailScreen or a shared util):**

```ts
function stepText(n: StepNode): string {
  return n.instruction ?? n.title;
}
const EXPAND_THRESHOLD = 80;
```

**RecipeDetailScreen steps rendering (V2):**

```tsx
const recipeStepAcc = useAccordion(); // one accordion for all steps

<ol className="recipe-steps">
  {steps.map((n) => {
    const text = stepText(n);
    const needsExpand = text.length > EXPAND_THRESHOLD;
    return (
      <li className="recipe-step" key={n.nodeId}>
        {needsExpand ? (
          <ExpandText
            text={highlightIngredients(text)}
            open={recipeStepAcc.isOpen(n.nodeId)}
            onToggle={() => recipeStepAcc.toggle(n.nodeId)}
            clamp={2}
          />
        ) : (
          <span className="recipe-step-title">{highlightIngredients(text)}</span>
        )}
        <span className="recipe-step-meta">...</span>
      </li>
    );
  })}
</ol>
```

Import additions to `RecipeDetailScreen.tsx`: add `ExpandText, useAccordion` from `./Expandable`.

**`ExpandText` component — no changes to the component itself in V2.** The existing props, class names, and aria attributes are correct. The only addition is a V2 usage site.

**When to use `useAccordion` vs. local state:**

- Use `useAccordion` when you have a list of items and only one should be readable at a time (steps, NEXT panel entries, reorder rows). Single-open behavior reduces cognitive load in a list.
- Use local `useState<boolean>` when there is only one expandable item on the page (no mutual exclusion needed).
- Use local `useState<Set<string>>` when all items may be open simultaneously (e.g., a blend ingredient that can be expanded independently of others — see the existing blend toggle in `RecipeDetailScreen`).

**Character threshold rationale:** 80 characters is roughly one full line on a 390 px viewport at the app's base font size. Steps shorter than this are fully visible without truncation even on small screens, so adding the expand affordance adds friction with no benefit. Steps longer than 80 characters benefit from clamp-2 (showing the first ~two lines, hiding the rest).

**CSS classes involved (no new classes needed):**
- `.expandable` — button wrapper, existing.
- `.expandable.open` — expanded state, existing.
- `.expandable-caret` — caret span, existing, `aria-hidden`.
- `.clamp`, `.clamp-1`, `.clamp-2`, `.clamp-3` — line-clamp utility classes, existing.
- `.recipe-step-title` — existing class for the non-expanded path; retained for short steps.

## Data and Dependencies

- `ExpandText` and `useAccordion` have no data dependencies. They are pure UI primitives.
- `RecipeDetailScreen.tsx` already imports `highlightIngredients` and the step rendering loop. Adding `ExpandText` + `useAccordion` is a two-import, one-hook-call, one-conditional-branch change.
- `PreviewScreen.tsx` and `CookScreen.tsx` are unaffected by the V2 change; they already use `ExpandText` correctly.
- Test additions: `expandable.test.tsx` already covers the accordion mutual-exclusion and open/close toggle. A new test case in `RecipeDetailScreen` tests should assert that steps above 80 chars render a `button[aria-expanded]` and steps at or below 80 chars render a `span.recipe-step-title` with no button.
