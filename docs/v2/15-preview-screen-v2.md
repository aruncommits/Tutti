# 15 — Preview Screen V2

## Overview

The Preview screen is the final checkpoint between planning and cooking. After the user selects dishes and sets a serve time on the Home screen, the engine compiles a MasterExecutionPlan and Preview renders it as a visual Gantt timeline — showing exactly when each parallel thread of cooking begins and ends. The user can inspect the schedule, reorder steps if they prefer a different opening sequence, then launch Cook mode. Preview exists to give the user confidence before committing to a live session: they see the full shape of the work, not just a flat list of steps.

## Current State

**File:** `apps/web/src/screens/PreviewScreen.tsx`

The screen renders several sections in sequence:

- **Header:** Projected serve time (formatted HH:MM) and a sub-line with start time, total active minutes, dish count (tempo).
- **Dish legend:** Color swatches (squares) beside each recipe name and its step count. Colors come from `kindColorOf()` in `ingredientColor.tsx`.
- **Gantt chart:** Horizontal bars plotted on a shared time axis. Each bar is positioned and sized using `left` / `width` percentages derived from `schedule[].startTime` and `schedule[].duration`. Bars are color-coded by dish.
- **"Your order" section (conditional):** Rendered only when the plan has more than one dish. Lists every step with ↑/↓ reorder buttons. Step labels are plain text with no truncation and no dish attribution.
- **Footer:** "All dishes ready together at HH:MM" line, then two action buttons — **Start** (launches Cook mode) and **Edit** (returns to Home). Below the buttons: "✓ Saved to your meals" hint text.

**What works:** Gantt rendering is correct and color-coded. Reorder buttons fire state updates that recompile the plan. The Edit button returns to the Home screen. The "Saved to your meals" hint reflects accurate timing (saved at plan-build, not cook-end).

**What is broken or missing:**
- No NOW cursor on the Gantt — the user cannot see where the present moment falls relative to the timeline.
- Dish legend entries are inert — tapping a dish name does nothing.
- Steps in "Your order" carry no visual dish attribution — the user cannot tell which step belongs to which dish without cross-referencing the legend.
- Long step text overflows or wraps uncontrolled — no truncation, no expand affordance.
- The Start button label is "Start" — generic and does not convey forward motion or estimated duration.
- No share or export affordance.
- No guard for an empty or degenerate plan (zero nodes) — the screen renders a blank Gantt with no feedback.
- No print stylesheet — printing produces raw button-heavy layout.
- Estimated total time is shown only in the header paragraph, not surfaced at the action point (the button).

## Problem

From a real user's perspective:

1. **Disorientation in the timeline.** If the user opens Preview at 6:15 PM for a 7:00 PM serve time, the Gantt shows bars but nothing marks where *now* is. The user cannot tell how much runway they have or whether they need to start immediately.

2. **Legend is decoration, not navigation.** There are four color swatches for four dishes. The user wants to find the steps for "Daal Tadka" specifically — they have to scan the entire "Your order" list manually because tapping the legend entry does nothing.

3. **Step attribution is lost in reorder view.** After reordering, step 3 might be a Chicken step and step 4 a Rice step, but both rows look identical in format. The user loses track of which dish they are affecting.

4. **Long step text is ugly and wastes space.** A step like "Marinate the chicken thighs with yogurt, turmeric, red chilli powder, garam masala, and salt for at least 30 minutes" wraps across three lines in every row. Most steps are long. There is no collapse.

5. **The Start button undersells the commitment.** "Start" could mean anything. "Start cooking → (~45 min)" tells the user exactly what they are committing to and feels like a launch, not a menu item.

6. **No sharing.** A user who planned a dinner party menu and built a 6-dish plan has no way to send it to a co-cook or save it outside the app.

7. **Silent failure on bad plans.** If the plan arrives with zero nodes — a bug or a race condition — the screen renders nothing meaningful. The user sees an empty Gantt and no path forward.

## V2 Design

**NOW cursor on Gantt.** A vertical line at the percentage position corresponding to the current wall-clock time is overlaid on the Gantt SVG/div whenever the computed serve time is today and the current time falls within the timeline window. The cursor is rendered in a high-contrast accent color (CSS var `--color-accent`) with a small "NOW" label at the top. It updates on a 60-second interval via `useEffect` + `setInterval`. If the current time is before timeline start or the serve time is on a different day, the cursor is not shown.

**Clickable dish legend.** Each legend row becomes a button. Tapping it scrolls the "Your order" section to the first step belonging to that dish. Scroll target uses `Element.scrollIntoView({ behavior: 'smooth', block: 'start' })`. The currently-highlighted dish (most recently tapped) gets a subtle `background: var(--color-surface-raised)` on its legend row to confirm selection. This is cosmetic only — no filter, all steps remain visible.

**Color swatches in step rows.** Each step row in "Your order" prepends a 10×10 px rounded square swatch in the dish color. The swatch is `aria-hidden` and carries a `title` of the dish name for pointer users. This makes it instantly clear which dish each step belongs to after reordering.

**Step truncation with ExpandText.** The `ExpandText` component already exists in the web package. Each step label is wrapped in `<ExpandText maxChars={60}>`. Truncated steps show "… more" inline. Expanded steps show the full text. State is per-step (index key), local to the component, not persisted.

**Renamed Start button with duration.** The primary CTA reads `Start cooking → (~{N} min)` where N is the total plan duration in minutes, rounded to the nearest 5. Duration is derived from `plan.projectedServeTime - plan.schedule[0].startTime` converted to minutes. The `~` prefix and rounding communicate approximation honestly.

**Share plan.** A secondary "Share plan" button (outline style, beside Edit) triggers an `onShare` callback. The callback formats a plain-text summary:

```
Tutti plan — serves at 7:00 PM
Dishes: Daal Tadka, Jeera Rice, Raita, Papad
Start at: 6:15 PM (~45 min active)

Steps (your order):
1. [Daal] Soak chana dal — 10 min
2. [Rice] Rinse and soak basmati — 5 min
...
```

It calls `navigator.share({ title, text })` if the Web Share API is available. Fallback: `navigator.clipboard.writeText(text)` + a brief toast "Copied to clipboard". The share button is not shown if both APIs are unavailable (feature-detect on mount).

**Empty plan guard.** At the top of the render tree, before any section, check `plan.schedule.length === 0`. If true, render an error state:

- Icon: a simple exclamation circle (SVG inline or from the existing icon set).
- Heading: "Something went wrong"
- Body: "We couldn't build a plan from those dishes. Go back and try again."
- Single button: "← Back to Home" which calls `onEdit()`.

The normal screen body is not rendered at all in this state.

**Print stylesheet.** A `<style media="print">` block (or a `@media print` block in the component's CSS module) hides `.preview-actions`, `.preview-share-btn`, `.now-cursor-label`, and the reorder buttons (`↑`, `↓`). It sets the Gantt container to `page-break-inside: avoid` and the step list to `font-size: 11pt; line-height: 1.5`. All expanded ExpandText instances show full text in print (override `max-height: none`).

**"✓ Saved to your meals" hint stays.** No change — the meal record is written when the plan is built, not when cooking ends. The hint remains below the action buttons.

## Spec

### Component: `PreviewScreen`

**File:** `apps/web/src/screens/PreviewScreen.tsx`

**Props (existing, unchanged):**
```ts
interface PreviewScreenProps {
  plan: MasterExecutionPlan;
  recipes: RecipeGraph[];
  onStart: () => void;
  onEdit: () => void;
}
```

**New internal state:**
```ts
const [highlightedDishId, setHighlightedDishId] = useState<string | null>(null);
const [nowPct, setNowPct] = useState<number | null>(null);          // 0–100 or null
const [shareAvailable, setShareAvailable] = useState(false);
const [copyToast, setCopyToast] = useState(false);
```

**Step ref map** (for legend scroll-to):
```ts
const stepRefs = useRef<Record<string, HTMLLIElement | null>>({});
// key: `${recipeId}-0` for the first step of each dish
```

**NOW cursor effect:**
```ts
useEffect(() => {
  setShareAvailable(
    typeof navigator.share === 'function' ||
    typeof navigator.clipboard?.writeText === 'function'
  );

  const timelineStart = plan.schedule[0]?.startTime ?? 0;   // ms epoch
  const timelineEnd   = plan.projectedServeTime;             // ms epoch
  const span          = timelineEnd - timelineStart;
  if (span <= 0) return;

  const tick = () => {
    const now = Date.now();
    if (now < timelineStart || now > timelineEnd) {
      setNowPct(null);
    } else {
      setNowPct(((now - timelineStart) / span) * 100);
    }
  };
  tick();
  const id = setInterval(tick, 60_000);
  return () => clearInterval(id);
}, [plan]);
```

**Duration computation:**
```ts
const totalMinutes = Math.round(
  (plan.projectedServeTime - (plan.schedule[0]?.startTime ?? plan.projectedServeTime)) / 60_000 / 5
) * 5;
const durationLabel = totalMinutes > 0 ? ` (~${totalMinutes} min)` : '';
```

**Empty plan guard (top of JSX return):**
```tsx
if (plan.schedule.length === 0) {
  return (
    <div className="preview-error">
      <ExclamationCircleIcon className="preview-error__icon" aria-hidden />
      <h2 className="preview-error__heading">Something went wrong</h2>
      <p className="preview-error__body">
        We couldn't build a plan from those dishes. Go back and try again.
      </p>
      <button className="btn btn--secondary" onClick={onEdit}>
        ← Back to Home
      </button>
    </div>
  );
}
```

**Legend item (updated):**
```tsx
<button
  key={recipe.recipeId}
  className={`preview-legend__item ${highlightedDishId === recipe.recipeId ? 'preview-legend__item--active' : ''}`}
  onClick={() => {
    setHighlightedDishId(recipe.recipeId);
    const key = `${recipe.recipeId}-0`;
    stepRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }}
>
  <span
    className="preview-legend__swatch"
    style={{ background: kindColorOf(recipe.name) }}
    aria-hidden
  />
  <span className="preview-legend__name">{recipe.name}</span>
  <span className="preview-legend__count">{recipe.nodes.length} steps</span>
</button>
```

**Gantt NOW cursor (inside the Gantt container div, sibling to bars):**
```tsx
{nowPct !== null && (
  <div
    className="gantt__now-cursor"
    style={{ left: `${nowPct}%` }}
    aria-label="Current time"
  >
    <span className="gantt__now-label">NOW</span>
  </div>
)}
```

CSS for cursor:
```css
.gantt__now-cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-accent);
  pointer-events: none;
  z-index: 10;
}
.gantt__now-label {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: 0.05em;
}
```

**Step row (updated):**
```tsx
<li
  key={`${recipeId}-${stepIndex}`}
  ref={el => { stepRefs.current[`${recipeId}-${stepIndex}`] = el; }}
  className="preview-step"
>
  <span
    className="preview-step__swatch"
    style={{ background: kindColorOf(recipeName) }}
    title={recipeName}
    aria-hidden
  />
  <span className="preview-step__index">{globalIndex + 1}.</span>
  <span className="preview-step__text">
    <ExpandText maxChars={60}>{step.label}</ExpandText>
  </span>
  <div className="preview-step__reorder">
    <button onClick={() => moveUp(globalIndex)} disabled={globalIndex === 0}>↑</button>
    <button onClick={() => moveDown(globalIndex)} disabled={globalIndex === lastIndex}>↓</button>
  </div>
</li>
```

**Action row (updated):**
```tsx
<div className="preview-actions">
  <button className="btn btn--primary" onClick={onStart}>
    Start cooking →{durationLabel}
  </button>
  <button className="btn btn--secondary" onClick={onEdit}>
    Edit
  </button>
  {shareAvailable && (
    <button className="btn btn--outline preview-share-btn" onClick={handleShare}>
      Share plan
    </button>
  )}
</div>
{copyToast && <p className="preview-toast">Copied to clipboard</p>}
<p className="preview-saved-hint">✓ Saved to your meals</p>
```

**`handleShare` function:**
```ts
const handleShare = async () => {
  const serveTime = new Date(plan.projectedServeTime).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  });
  const startTime = new Date(plan.schedule[0].startTime).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  });
  const dishNames = recipes.map(r => r.name).join(', ');
  const stepLines = orderedSteps
    .map((s, i) => `${i + 1}. [${s.recipeName}] ${s.label}`)
    .join('\n');
  const text = [
    `Tutti plan — serves at ${serveTime}`,
    `Dishes: ${dishNames}`,
    `Start at: ${startTime}${durationLabel}`,
    '',
    'Steps (your order):',
    stepLines,
  ].join('\n');

  if (typeof navigator.share === 'function') {
    await navigator.share({ title: 'My Tutti cooking plan', text });
  } else {
    await navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2500);
  }
};
```

**Print styles (in CSS module or `<style media="print">`):**
```css
@media print {
  .preview-actions,
  .preview-share-btn,
  .preview-toast,
  .gantt__now-label,
  .preview-step__reorder { display: none !important; }

  .gantt { page-break-inside: avoid; }

  .preview-step { font-size: 11pt; line-height: 1.5; }

  /* Force ExpandText to show full content in print */
  .expand-text__overflow { max-height: none !important; }
  .expand-text__toggle { display: none !important; }
}
```

**CSS classes summary (new or changed):**

| Class | Purpose |
|---|---|
| `preview-error` | Full-screen error state wrapper |
| `preview-error__icon` | Error icon, centered |
| `preview-error__heading` | "Something went wrong" |
| `preview-error__body` | Explanatory body copy |
| `preview-legend__item` | Converts legend row to `<button>` |
| `preview-legend__item--active` | Highlight on most-recently-tapped dish |
| `gantt__now-cursor` | Vertical NOW line |
| `gantt__now-label` | "NOW" text above cursor |
| `preview-step__swatch` | 10×10 dish color square in step row |
| `preview-share-btn` | Share plan button |
| `preview-toast` | "Copied to clipboard" transient message |
| `preview-saved-hint` | "✓ Saved to your meals" line |

## Data & Dependencies

**Reads from:**
- `plan: MasterExecutionPlan` — `plan.schedule[]` (startTime, duration, recipeId, label), `plan.projectedServeTime`, `plan.schedule[0].startTime`
- `recipes: RecipeGraph[]` — `recipe.recipeId`, `recipe.name`, `recipe.nodes.length`
- `kindColorOf(name)` from `apps/web/src/utils/ingredientColor.tsx` — dish color per recipe name
- `ExpandText` component from `apps/web/src/components/ExpandText.tsx` (already exists)
- `Date.now()` polled every 60 s for NOW cursor
- `navigator.share` / `navigator.clipboard.writeText` — Web Share API + clipboard fallback

**Writes to / calls:**
- `onStart()` — launches Cook screen (App.tsx transitions `screen → 'cook'`)
- `onEdit()` — returns to Home screen (App.tsx transitions `screen → 'home'`)
- `Element.scrollIntoView()` — DOM scroll, no state effect outside Preview

**Sibling screens:**
- **Home screen** builds the plan and transitions to Preview. If the user taps Edit, they return to Home with the existing recipe selection intact.
- **Cook screen** receives the (possibly reordered) plan after Start. Reorder state in Preview must be passed back up to App.tsx state or lifted to the shared plan atom before navigation.
- **Meals screen (Me tab)** — the meal record is already written when the plan is built; Preview's "Saved to your meals" hint reflects this. No write happens from Preview itself.

**State owned externally (App.tsx):**
- The reordered plan is the source of truth passed into Preview. If reorder mutates a local copy, App.tsx must receive the updated plan (via `onPlanChange` callback or a shared atom) before navigating to Cook, otherwise Cook receives the unmodified order. This contract should be made explicit in the implementation ticket: either lift plan state to App.tsx or pass an `onPlanChange(updated: MasterExecutionPlan) => void` prop.

**Tests to add or update:**
- `PreviewScreen.test.tsx`: empty plan → error state renders; NOW cursor present when `Date.now()` mocked within timeline window; legend click scrolls (mock `scrollIntoView`); share button absent when both APIs unavailable; share formats correct text; step swatch renders with correct background color; ExpandText invoked with `maxChars={60}`; print-class assertions via `window.matchMedia` mock.
