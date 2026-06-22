# 46 — Design Cook Mode V2: NOW/NEXT/PASSIVE Layout

## Overview

Cook mode is the screen where the user executes a compiled meal plan step by step. The NOW/NEXT/PASSIVE layout is a spatial prioritization system: the user's immediate task dominates the screen, the upcoming task sits below as peripheral awareness, and background tasks (simmering, resting, chilling) collapse into a compact indicator so they stay monitored without demanding attention. The goal is zero cognitive load — one thing to read, one button to tap, and confidence that nothing behind the scenes is being forgotten.

## Current State

Files: `packages/web/src/screens/CookScreen.tsx`, `packages/web/src/components/CookTimer.tsx`, `packages/web/src/components/StepCard.tsx`.

The cook screen renders a vertical list of step cards grouped into NOW / NEXT / PASSIVE buckets. A `useWakeLock` hook prevents screen sleep. `useSpeech` provides read-aloud via SpeechSynthesis. Multiple independent `CookTimer` instances run concurrently. The step-complete flow calls `advanceStep()` from the engine's `MasterExecutionPlan`. Undo reverts to the previous step via `rewindStep()`. Timer expiry fires a console log and a speech utterance but no vibration. The layout is a scrollable list — the user must scroll to find their current step if they have been away.

Problems verified from codebase: no progress bar, passive steps are interleaved with active ones rather than separated, the complete button is card-sized rather than full-width, and the voice button is inside the step card (scrolls out of view).

## Problem

From a cooking user's perspective:

- Hands are wet or greasy — the user cannot scroll to find the current step. The active step must always be visible without scrolling.
- Multiple timers firing in the background cause anxiety about which one just ended. There is no way to glance at all passive-step timers simultaneously.
- The complete button is small and positioned mid-card. In a kitchen environment (glanced at from distance, tapped with a knuckle) it needs to be large and at the bottom of the natural thumb zone.
- The voice button scrolls away with the step card. Users who want read-aloud as a habit cannot rely on it being reachable.
- Timer expiry has no physical alert — vibration is not used even on devices that support it.

## V2 Design

The screen becomes a fixed-layout, non-scrolling surface divided into three persistent zones. Scrolling is removed entirely from the main cook view. The NOW panel is the dominant region because that is where the user's eyes must go immediately. The NEXT panel provides a brief look-ahead so transitions feel predictable. The PASSIVE row is collapsed by default because simmering steps require no action — they need monitoring, not attention.

The voice button is pulled out of the step card and pinned to the top-right corner of the NOW panel using `position: sticky` within the panel, so it stays reachable regardless of instruction length.

Timer-end behavior adds `navigator.vibrate([400, 100, 400])` wrapped in a feature-detect, a CSS animation class `timer-pulse-red` on the timer display (0.5s pulsing red glow, 3 cycles), and a SpeechSynthesis utterance `"Step done — [step title]"`. All three fire simultaneously.

Swipe left on the NOW panel completes the current step (mirrors the Done button). Swipe right undoes. Both trigger haptic feedback via `navigator.vibrate(50)` if available. The gesture is supplementary — the Done button remains the primary affordance.

## Spec

### Layout skeleton

```
.cook-screen
  .cook-progress           /* thin line, top */
  .cook-now                /* 60vh */
    .cook-now__voice       /* top-right, sticky */
    .cook-now__title
    .cook-now__instruction
    .cook-now__timer
    .cook-now__done        /* full-width btn */
    .cook-now__undo        /* text link */
  .cook-next               /* 25vh */
    .cook-next__label
    .cook-next__title
  .cook-passive            /* 15vh */
    .cook-passive__summary /* collapsed */
    .cook-passive__list    /* expanded, overlay */
```

The three panels are direct children of `.cook-screen` which uses `display: flex; flex-direction: column; height: 100dvh; overflow: hidden`.

### Progress bar — `.cook-progress`

```css
.cook-progress {
  height: 3px;
  background: var(--bg-muted);
}
.cook-progress__fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.4s ease;
}
```

`width` = `(completedSteps / totalSteps) * 100%`. Computed from `MasterExecutionPlan.schedule` — count nodes where `status === "done"` divided by `schedule.length`. `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `role="progressbar"` on the fill element.

### NOW panel — `.cook-now`

Height: `60dvh`. `position: relative` to anchor the voice button.

**Step title** — `.cook-now__title`: `font-size: 1.5rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem`. Max 2 lines; `display: -webkit-box; -webkit-line-clamp: 2; overflow: hidden`.

**Instruction** — `.cook-now__instruction`: `font-size: 1.1rem; font-weight: 400; line-height: 1.5`. Max 5 lines; overflow hidden with gradient fade at bottom (`::after` pseudo-element `background: linear-gradient(transparent, var(--bg))`). Full text available via the voice button.

**Timer** — `.cook-now__timer`: renders only when `currentNode.duration > 0`. Display format `MM:SS` (e.g., `12:30`). `font-size: 2.5rem; font-variant-numeric: tabular-nums; font-weight: 700; text-align: center; letter-spacing: 0.05em`. When timer reaches 0: add class `timer-pulse-red` → `animation: pulseRed 0.5s ease-in-out 3`. Keyframes: `0%,100% { color: var(--text) } 50% { color: #e53e3e; text-shadow: 0 0 12px #e53e3e44 }`.

Timer end side effects (fired once, on transition from 1s to 0s):
```ts
if (navigator.vibrate) navigator.vibrate([400, 100, 400]);
const utt = new SpeechSynthesisUtterance(`Step done — ${currentNode.label}`);
utt.rate = 1.0;
window.speechSynthesis.speak(utt);
```

**Done button** — `.cook-now__done`: `width: 100%; height: 56px; font-size: 1.1rem; font-weight: 600`. Class composition: `btn big-btn`. Label: `"Done ✓"`. On tap: call `advanceStep(planState)`, clear current timer, animate panel transition (slide current content up, next content slides in from below — 300ms ease).

**Undo link** — `.cook-now__undo`: `font-size: 0.85rem; color: var(--muted); text-decoration: none; margin-top: 0.5rem; display: block; text-align: center`. Label: `"← Previous step"`. Hidden (visibility: hidden, not display: none — preserves layout space) when `completedSteps === 0`. On tap: call `rewindStep(planState)`.

**Voice button** — `.cook-now__voice`: `position: absolute; top: 12px; right: 12px; width: 44px; height: 44px; border-radius: 50%`. Microphone icon (`🎤` or SVG). On tap: read current instruction via `useSpeech(currentNode.instruction)`. Active state (currently reading): filled icon + `background: var(--accent-light)`. `aria-label="Read step aloud"`. Tooltip key: `"cook-voice"` (shows once on first cook session).

### NEXT panel — `.cook-next`

Height: `25dvh`. `background: var(--bg-muted); border-top: 1px solid var(--border); padding: 12px 16px`.

**Label**: `"Coming up:"` — `font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted)`.

**Next step title**: `font-size: 1rem; font-weight: 500; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60ch`. Truncated at 60 chars. No timer shown in this panel. When there is no next step (last active step is in progress): label changes to `"Almost done — last step"` and title is empty.

### PASSIVE row — `.cook-passive`

Height: `15dvh`. `border-top: 1px solid var(--border); display: flex; align-items: center; padding: 0 16px`.

**Collapsed summary** — `.cook-passive__summary`:  
`"[N] step[s] simmering ▾"` where N = count of currently running passive nodes.  
`font-size: 0.9rem; color: var(--muted)`.  
When N = 0: `"No passive steps"` in lighter muted, non-tappable.  
When N ≥ 1: tappable — tap expands the passive list overlay.

**Expanded list** — `.cook-passive__list`:  
Renders as a bottom-sheet overlay (`position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg); border-radius: 16px 16px 0 0; padding: 20px; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); z-index: 200`).  
Each passive step row: `[step title — flex: 1] [MM:SS remaining — tabular-nums]`.  
Tap anywhere outside or drag down to close.  
`aria-label="Passive steps running in background"`.

### State shape additions

```ts
interface CookScreenState {
  currentIndex: number;
  completedIndices: Set<number>;
  passiveTimers: Map<nodeId, secondsRemaining>;
  voiceActive: boolean;
  passiveExpanded: boolean;
}
```

### Component tree

```
CookScreen
  CookProgress          (completedSteps, totalSteps)
  CookNowPanel          (node, onDone, onUndo, onVoice)
    CookTimer           (durationSeconds, onExpire)
    VoiceButton         (instruction, active)
  CookNextPanel         (node | null)
  CookPassiveRow        (passiveNodes: PassiveNodeStatus[])
    CookPassiveSheet    (nodes, open, onClose)
```

### Touch interaction

Swipe detection on `.cook-now`: use `touchstart`/`touchend` diff. If `deltaX < -60` → `advanceStep()`. If `deltaX > 60` → `rewindStep()`. Threshold is 60px (not percentage-based, to prevent accidental triggers during scrolling in the instruction text). Fire `navigator.vibrate(50)` on gesture recognition.

## Data & Dependencies

- `MasterExecutionPlan` from `compile()` in `@tutti/engine` — `schedule[]`, `projectedServeTime`
- `useWakeLock` (existing hook, `packages/web/src/hooks/useWakeLock.ts`)
- `useSpeech` (existing hook, `packages/web/src/hooks/useSpeech.ts`)
- `navigator.vibrate` — feature-detected, gracefully absent
- `CookTimer` component — receives `durationSeconds`, calls `onExpire` callback
- No network calls in cook mode — runs fully offline from compiled plan
- Passive timer state must survive screen orientation change — store in `useRef` not `useState` to avoid re-render on each tick; only re-render on second boundaries via `setInterval`
- Transition back to Preview screen: `setScreen("preview")` — Back button top-left or hardware back

---

# 47 — Design Recipe Detail V2: Full Screen Layout

## Overview

The recipe detail screen is the single source of truth for everything a user needs to know about one dish: what it is, how long it takes, what goes in it, how to cook it, and what tier of effort it requires. In V2 it replaces the preview modal for full recipes (Browse still uses a lightweight preview modal for quick add) and consolidates nutrition, dietary info, variant selection, and cook history into a single scrollable view. The screen is reached from Browse (full-screen push), Studio (edit entry point), and the Home plan builder.

## Current State

Files: `packages/web/src/screens/RecipeScreen.tsx`, `packages/web/src/components/NutritionStrip.tsx`, `packages/web/src/components/IngredientList.tsx`, `packages/web/src/components/StepList.tsx`, `packages/web/src/components/IngredientLegend.tsx`.

The recipe screen renders: back button, recipe name, a flat ingredient list with color dots, the ingredient legend below the list, and a numbered step list. `NutritionStrip` exists and renders macros. `IngredientLegend` renders colored dot + KIND_LABEL pairs.

What is missing or broken: tier/variant tabs not implemented (the recipe shown is whichever tier was passed in — no switching); allergen badges not surfaced; diet badges not surfaced; collection chips not rendered; user cook history (rating, notes, cook count) not shown; the ingredient legend is positioned below the ingredient list (users scan ingredients without knowing the color system until after they are done); the action row has an "Add to plan" button but no "Make it mine", Print, or Back link; back navigation returns to home regardless of which screen opened the recipe (this was recently fixed in App.tsx via `prevScreen` tracking and confirmed working).

## Problem

From a real user's perspective:

- "What does the color on the ingredient mean?" — the legend is below the list, so users see unfamiliar colored dots before they know what they mean.
- "Can I see the easier version of this recipe?" — tier switching requires navigating away and returning, which is a dead end.
- "I made this last week and added lime — where did I write that?" — cook notes exist in localStorage but are not shown on the recipe screen.
- "I want to print this for my grandmother" — no print action exists.
- Allergen and dietary information is not visible without leaving the screen.

## V2 Design

The legend moves above the ingredient list — users read the key before they encounter the symbols. Variant tabs are placed above the ingredient list (below the meta row) so the user picks their effort level and then reads the corresponding ingredients. The action row is at the bottom of the screen, sticky on scroll, so it is always reachable without scrolling back to the top. Cook history (star rating, cook count, personal note) appears as a muted note block near the top — after meta but before content — so returning users immediately see their context.

No changes to the back button behavior (prevScreen fix already shipped).

Print: `window.print()` + a `@media print` stylesheet that hides the action row, tab bar, and back button and renders the recipe in a clean two-column layout.

## Spec

### URL / navigation

`setScreen("recipe", { recipeId, fromScreen })` — `fromScreen` stored in `prevScreen` state already in `App.tsx`. Back button calls `setScreen(prevScreen)`.

### Header

```
.recipe-header
  .recipe-header__back     ← (button, aria-label="Back")
  .recipe-header__swatch   (16×16 color dot, kindColorOf first ingredient)
  .recipe-header__name     (h2, font-size: 1.4rem, font-weight: 700)
```

The color swatch uses the dominant ingredient kind color. If no ingredients resolve a kind, swatch is omitted.

### Meta row — `.recipe-meta`

Single flex row, `flex-wrap: wrap; gap: 8px; align-items: center; font-size: 0.9rem; color: var(--muted)`.

Segments (left to right):
- `"[totalMinutes] min"` — computed from `RecipeGraph` edges sum
- `"serves [servings]"` — from `RecipeGraph.servings`
- Tier badge: `simple` | `moderate` | `complex` — `.badge .badge--tier-{tier}`
- Course badge (if `recipe.course` present): e.g., `"main"`, `"dessert"` — `.badge .badge--course`
- Allergen badges: for each allergen in `recipe.allergens[]` — `.badge .badge--allergen` (red-tinted)

All badges: `font-size: 0.75rem; padding: 2px 8px; border-radius: 999px; font-weight: 600`.

### Diet badges row — `.recipe-diets`

Renders only if `recipe.diets.length > 0`. Horizontal scroll row of diet chips: `.diet-chip` per diet (green-tinted). Same component as Home screen diet filter chips.

### NutritionStrip

Existing component — placed directly below diet badges row. No changes to component internals.

### Cook history block — `.recipe-history`

Renders only if localStorage key `tutti.history.{recipeId}` exists.

```ts
interface CookHistory {
  cookCount: number;
  lastRating: 1 | 2 | 3 | 4 | 5;
  note: string;
  lastCooked: ISO8601;
}
```

Display: `"★★★★☆ cooked [N]× — '[note]'"` — `font-size: 0.85rem; font-style: italic; color: var(--muted); padding: 8px 0; border-top: 1px solid var(--border-muted)`. Stars rendered as filled/unfilled Unicode characters from `lastRating`.

### Variant tabs — `.recipe-variants`

Renders above ingredient list. Only renders if the catalog has multiple tiers for this dish (i.e., `dishId` has `simple`, `moderate`, `complex` variants loaded from Supabase or engine). If only one tier: omit entirely.

Each tab: `"[tier label] · [totalMinutes] min"` — e.g., `"Simple · 25 min"`.

Tab bar: `role="tablist"`. Each tab: `role="tab"`, `aria-selected={active}`. Active tab: bold, underline indicator `border-bottom: 2px solid var(--accent)`. Tab switch: loads the corresponding `RecipeGraph` for that tier via `getRecipeByDish(dishId, tier)` — already implemented in engine; re-renders ingredient list and step list.

Tier order: Simple → Standard → Elaborate (matching engine `TIERS` constant).

### Ingredient legend — `.recipe-legend`

Position: ABOVE ingredient list, below variant tabs. Existing `IngredientLegend` component moved here. Compact horizontal scroll row. Each entry: `[colored dot 8×8] [KIND_LABEL text]`. `font-size: 0.8rem; color: var(--muted); gap: 12px; padding: 8px 0`.

Only shows kind labels that appear in the current recipe's ingredient list — filter `KIND_LABEL` entries by kinds present.

### Ingredient list — `.recipe-ingredients`

Existing `IngredientList` component. Each row `.ing-row`:

```
[color dot 10×10] [ingredient name — flex: 1] [amount — text-align: right; color: var(--muted)]
```

Blended ingredients: collapsed by default under a `"▶ Blend: [blend name]"` expander. Tap expander to reveal sub-ingredients. Existing behavior — no changes.

### Steps — `.recipe-steps`

Numbered list. Each step:

```
.step
  .step__num     (muted, 0.8rem)
  .step__body
    ExpandText    (threshold: 80 chars, "... show more" link)
    .step__meta   (phase badge + duration chip + "hands-free" chip if node.passive)
```

Phase badge: `"prep"` | `"cook"` | `"rest"` — `.badge .badge--phase`. Duration chip: `"[N] min"` — rendered from node duration. Hands-free chip: `"hands-free"` — only on passive nodes; `.badge .badge--passive` (blue-tinted).

### Collection chips — `.recipe-collections`

Renders if `collectionsContaining(recipeId).length > 0`. Horizontal scroll row of read-only chips: `"📋 [collection name]"`. Tapping a chip navigates to that collection in Studio.

### Action row — `.recipe-actions`

`position: sticky; bottom: 0; background: var(--bg); border-top: 1px solid var(--border); padding: 12px 16px; display: flex; flex-direction: column; gap: 8px`.

Primary button: `"+ Add to tonight's plan"` — `.btn .big-btn`. Calls `addToPlan(recipeId)` → navigates to Home with this recipe pre-selected.

Secondary links (horizontal row, `gap: 16px; font-size: 0.9rem`):
- `"✏️ Make it mine"` — navigates to `editRecipe` screen with this recipe loaded
- `"Back"` — calls `setScreen(prevScreen)`
- `"🖨 Print"` — `window.print()`. Hidden in `@media print`.

Print stylesheet (`@media print`): hide `.tab-bar`, `.recipe-actions`, `.recipe-header__back`, `.recipe-variants` (print active tier only). Print body: `font-size: 12pt; max-width: 720px; margin: 0 auto`. Two-column print layout: ingredients left, steps right (`columns: 2`).

### ExpandText component

`ExpandText.tsx` (may already exist — verify): `threshold` prop (default 80 chars). If `text.length <= threshold`: render plain. Else: render truncated text + `"... show more"` inline link. Expanded: full text + `"show less"` link. No height animation needed — simple toggle.

## Data & Dependencies

- `RecipeGraph` from `@tutti/engine` — `recipeId`, `name`, `servings`, `nodes[]`, `edges[]`
- Tier variants: `getRecipeByDish(dishId, tier)` engine call (or Supabase `/api/library/dish/:dishId`)
- `kindColorOf(name)`, `KIND_LABEL` from `ingredientColor.tsx`
- `collectionsContaining(recipeId)` from collections store (localStorage `tutti.collections`)
- Cook history: localStorage `tutti.history.{recipeId}`
- Diet info: `recipe.diets[]`, allergens: `recipe.allergens[]` — must be added to `RecipeGraph` type if not present
- `prevScreen` state in `App.tsx` — already tracking (confirmed fixed)
- `NutritionStrip` — `packages/web/src/components/NutritionStrip.tsx`
- `IngredientLegend` — `packages/web/src/components/IngredientLegend.tsx` — move render position only, no internal changes

---

# 48 — Design Micro-Onboarding: Tooltip and Coach Mark Spec

## Overview

Micro-onboarding is the system for teaching features at the moment of relevance rather than front-loading all instructions. Instead of a tour, Tutti shows one targeted tooltip at a time, triggered when the user first encounters a feature. Each tooltip is contextual, appears once per feature per install, and disappears on any tap. The system prevents tooltip stacking (only one visible at a time) and avoids disrupting users who already know a feature (dismissed state persists indefinitely in localStorage).

## Current State

No tooltip or coach mark system exists in the codebase. The onboarding slides (`OnboardingScreen.tsx`) explain the app at install time but nothing teaches individual features in context. New features (menu import, build-plan serve time, browse quick-add) are discovered by accident or not at all.

## Problem

- Users tap "Build Plan" without having set a serve time — they get a plan for "now" and do not understand why. A tooltip on the serve-time chip at first visit would preempt this confusion.
- The menu import button in Studio has low tap rate — users do not know what it does from the icon alone. A one-time tooltip on first visit to Studio would explain it.
- Browse shows an "Add" button on dish cards — users already in Home mode do not realize they can add from Browse without going back. A tooltip on the first "Add" button in Browse would explain the cross-screen shortcut.
- The voice button in Cook mode is in the top-right corner and overlooked. A tooltip on the first cook session would surface it.

## V2 Design

`Tooltip.tsx` is a single reusable component. It accepts a `tooltipKey` (string), `targetRef` (RefObject<HTMLElement>), and `copy` (string ≤ 90 chars). It renders as a portal appended to `document.body` so it is never clipped by `overflow: hidden` parents.

Positioning is computed via `getBoundingClientRect()` on the target element. The tooltip prefers above the target; falls back to below if `top - tooltipHeight < 8px` (top of viewport plus safety margin). Horizontally it centers on the target but clamps to `[8px, viewport.width - tooltipWidth - 8px]` to stay on screen.

The tooltip manager (`useTooltip` hook) enforces the one-at-a-time rule by storing the currently active tooltip key in a module-level singleton (not React state — avoids re-render cascade). A new tooltip will not appear if `activeTooltipKey !== null`.

Show sequence: target mounts → 500ms delay (via `setTimeout`, cleared on unmount) → check `localStorage["tutti.tooltip.{key}"]` → if absent and no other tooltip active → render tooltip → start listening for tap-anywhere dismiss.

Dismiss sequence: any `pointerdown` on `document` → `localStorage.setItem("tutti.tooltip.{key}", "true")` → unmount tooltip → clear `activeTooltipKey`.

## Spec

### Tooltip component — `Tooltip.tsx`

```ts
interface TooltipProps {
  tooltipKey: string;        // unique feature key
  targetRef: RefObject<HTMLElement>;
  copy: string;              // max 90 chars
  delayMs?: number;          // default 500
}
```

```ts
export function Tooltip({ tooltipKey, targetRef, copy, delayMs = 500 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, above: true });

  useEffect(() => {
    if (localStorage.getItem(`tutti.tooltip.${tooltipKey}`)) return;
    if (activeTooltipKey !== null) return;

    const timer = setTimeout(() => {
      const rect = targetRef.current?.getBoundingClientRect();
      if (!rect) return;
      // compute position...
      activeTooltipKey = tooltipKey;
      setVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const dismiss = () => {
      localStorage.setItem(`tutti.tooltip.${tooltipKey}`, "true");
      activeTooltipKey = null;
      setVisible(false);
    };
    document.addEventListener("pointerdown", dismiss, { once: true });
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [visible]);

  if (!visible) return null;
  return createPortal(<div className="tooltip" style={...coords}>{copy}<span className="tooltip__arrow" /></div>, document.body);
}
```

Module-level singleton: `let activeTooltipKey: string | null = null;`

### CSS — `.tooltip`

```css
.tooltip {
  position: fixed;
  z-index: 9999;
  background: #1a1a1a;
  color: #ffffff;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 0.85rem;
  line-height: 1.4;
  max-width: 240px;
  pointer-events: none;          /* tap passes through to dismiss handler */
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  animation: tooltipFadeIn 0.15s ease;
}
.tooltip__arrow {
  position: absolute;
  width: 0; height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
}
.tooltip--above .tooltip__arrow {
  bottom: -6px;
  border-top: 6px solid #1a1a1a;
}
.tooltip--below .tooltip__arrow {
  top: -6px;
  border-bottom: 6px solid #1a1a1a;
}
@keyframes tooltipFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Tooltip keys and copy

| Key | Trigger location | Copy (≤ 90 chars) |
|---|---|---|
| `serve-time` | Home screen — serve-time chip, first mount | `"Tap to set when dinner should be ready"` |
| `build-plan` | Home screen — Build Plan button, after first dish added | `"Tap to generate your cooking timeline"` |
| `import-menu` | Studio screen — menu import button, first visit | `"Paste a restaurant menu to import all the dishes at once"` |
| `browse-add` | Browse screen — first dish card Add button visible in viewport | `"Add this dish to tonight's plan without leaving Browse"` |
| `cook-voice` | Cook screen — voice button, first cook session | `"Tap to hear the current step read aloud"` |

### Trigger placement in screens

**`serve-time`**: In `HomeScreen.tsx`, attach `tooltipRef` to the serve-time chip wrapper. Pass `tooltipKey="serve-time"` and `targetRef={tooltipRef}` to `<Tooltip>`. Render `<Tooltip>` as a sibling of the chip, not a child (to avoid portal-inside-portal issues).

**`build-plan`**: Attach to the Build Plan button. Only render the `<Tooltip>` when `plan.dishes.length > 0` (so it appears contextually after first dish is added, not on an empty home screen).

**`import-menu`**: Attach to the menu import button/icon in `StudioScreen.tsx`. Render on first mount of Studio.

**`browse-add`**: Attach to the Add button of the first dish card in `BrowseScreen.tsx` that is visible in the viewport (use `IntersectionObserver` to identify the first visible card; attach `targetRef` to that card's Add button). Delayed 800ms (slightly longer — page needs to settle after browse renders).

**`cook-voice`**: Attach to the voice button in `CookNowPanel`. Render only on the very first cook session. Gate with localStorage key `tutti.tooltip.cook-voice-session-gate` set when the first `compile()` result is consumed — prevents the tooltip firing on subsequent cooks.

### localStorage keys used

- `tutti.tooltip.serve-time` — `"true"` when dismissed
- `tutti.tooltip.build-plan` — `"true"` when dismissed
- `tutti.tooltip.import-menu` — `"true"` when dismissed
- `tutti.tooltip.browse-add` — `"true"` when dismissed
- `tutti.tooltip.cook-voice` — `"true"` when dismissed
- `tutti.tooltip.cook-voice-session-gate` — `"true"` after first cook begins (prevents re-showing on 2nd cook)

### Edge cases

- If target element is not in viewport when tooltip would fire (user scrolled away), skip — do not show tooltip for an off-screen element. Check via `rect.top < 0 || rect.bottom > window.innerHeight` after `getBoundingClientRect()`.
- If user is in dark mode: `background: #f0f0f0; color: #1a1a1a` — invert colors so tooltip reads as a system overlay distinct from app chrome.
- On SSR or if `localStorage` throws (private browsing mode in some browsers): wrap in try/catch, fail silently (never show tooltip rather than crash).
- If the same component mounts and unmounts rapidly (React strict mode double-mount): the `clearTimeout` in cleanup handles the race correctly because `activeTooltipKey` is only set after the delay resolves.

## Data & Dependencies

- `localStorage` — persisted dismiss state
- `document.body` for `ReactDOM.createPortal`
- `getBoundingClientRect()` — layout read, triggers layout but only once on show
- `IntersectionObserver` — only for `browse-add` trigger
- No network calls, no engine calls
- Touches: `HomeScreen.tsx`, `StudioScreen.tsx`, `BrowseScreen.tsx`, `CookScreen.tsx` — each adds one `<Tooltip>` render and one `useRef` attach

---

# 49 — Design Gesture Map: Every Touch Interaction in Tutti

## Overview

The gesture map is a comprehensive specification of all touch interactions in Tutti — swipes, taps, double-taps, and long-presses — with their trigger thresholds, feedback behaviors, and UI alternatives. It exists so that gesture behavior is consistent across screens (same threshold values, same feedback patterns), accessible (no feature is gesture-exclusive), and implementable without a gesture library (all gestures use native `touchstart`/`touchend` with a shared utility).

## Current State

Files: no centralized gesture utility exists. Individual screens implement ad-hoc touch handling. Cook screen has no swipe-to-complete. Onboarding slides use CSS scroll-snap for swiping. Bottom sheets have no swipe-to-close. Tab bar has no double-tap behavior. Meals history cards have no swipe-to-delete.

Confirmed working: onboarding slide swipe (CSS scroll-snap, not event-based). Everything else is either absent or inconsistent.

## Problem

- Cook screen: completing a step requires finding and tapping the Done button. With wet hands or distance cooking, a full-screen swipe would be far more reliable.
- Bottom sheets (library picker, passive steps list): users instinctively swipe down to close; nothing happens, so they tap elsewhere or look for an X button.
- Meals history: deleting a meal history entry requires navigating to a detail screen and finding a delete option. Swipe-left-to-delete is a universally understood mobile pattern.
- Tab bar double-tap to scroll-to-top is a standard iOS/Android behavior users expect but Tutti does not implement.
- Inconsistent thresholds: if different screens implement swipe with different distance thresholds, the app feels unreliable.

## V2 Design

A shared `useSwipe` hook (`packages/web/src/hooks/useSwipe.ts`) encapsulates all swipe detection with standard thresholds. All gesture-capable elements use this hook rather than inline touch handlers. Every gesture has a tap/button equivalent — this is enforced as a rule, not a preference.

Haptic feedback pattern: `navigator.vibrate(50)` for confirmatory gestures (swipe to complete a step), `navigator.vibrate([30, 20, 30])` for destructive gestures (swipe to delete). Both are no-ops on non-vibrating devices.

## Spec

### Shared swipe hook — `useSwipe.ts`

```ts
interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;           // px, default 60
  preventScroll?: boolean;      // default false
}

export function useSwipe(ref: RefObject<HTMLElement>, opts: SwipeOptions) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0, startY = 0;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const threshold = opts.threshold ?? 60;
      if (Math.abs(dx) > Math.abs(dy)) {       // horizontal swipe
        if (dx < -threshold) opts.onSwipeLeft?.();
        if (dx >  threshold) opts.onSwipeRight?.();
      } else {
        if (dy >  threshold) opts.onSwipeDown?.();
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [opts.onSwipeLeft, opts.onSwipeRight, opts.onSwipeDown]);
}
```

### Gesture table

| Screen / Component | Gesture | Trigger | Action | Haptic | UI Alternative |
|---|---|---|---|---|---|
| Onboarding slides | Swipe left | 30% of screen width | Next slide | None | Dot tap / Next button |
| Onboarding slides | Swipe right | 30% of screen width | Previous slide | None | Dot tap / Back button |
| Cook — NOW panel | Swipe left | 60px | Complete step (advanceStep) | vibrate(50) | Done ✓ button |
| Cook — NOW panel | Swipe right | 60px | Undo step (rewindStep) | vibrate(50) | ← Previous step link |
| Cook — passive sheet | Swipe down | 60px | Close sheet | None | Tap outside |
| Meals history card | Swipe left | 60px | Reveal Delete button | vibrate([30,20,30]) | Tap card → detail → delete |
| Library picker sheet | Swipe down | 60px | Close sheet | None | Tap outside / X button |
| Tab bar | Double tap (≤ 300ms between taps) | Any tab button | Scroll to top of that tab's content | None | Manual scroll up |

### Threshold rationale

Onboarding uses 30% of screen width (~117px on 390px device) because slides are wide full-screen panels and false positives from vertical scrolling are the main concern. 30% provides sufficient disambiguation.

Cook and all other swipes use an absolute 60px threshold because these are smaller elements where a percentage threshold would either be too sensitive (small cards) or too insensitive (full panels). 60px is large enough to avoid accidental trigger during tap (which typically has 5–10px drift) but small enough to feel responsive.

### Onboarding swipe — special case

Current implementation uses CSS `scroll-snap` on `.onboarding-slides` (horizontal scroll container). This is preserved — it is native, performant, and handles momentum scrolling correctly. The `useSwipe` hook is NOT applied to onboarding slides. The 30% threshold in the gesture table refers to the scroll-snap snap threshold (`scroll-snap-type: x mandatory` snaps when scroll exceeds 50% of slide width by default — override with JS scroll event if finer control is needed, but current behavior is acceptable).

### Meals swipe-to-delete — implementation

`.meal-card` wrapper: `position: relative; overflow: hidden`.  
`.meal-card__delete-reveal`: `position: absolute; right: 0; top: 0; bottom: 0; width: 80px; background: #e53e3e; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600`.  

On swipe left: set CSS `transform: translateX(-80px)` on `.meal-card__content` (transition: 200ms ease). Reveal shows `"Delete"` button. Tapping Delete calls `deleteMealHistory(mealId)`. Tapping anywhere else on the card collapses back. Swipe right when revealed collapses without deleting.

`aria-label="Delete meal entry"` on the reveal button. The swipe gesture itself has no ARIA annotation — it is purely an enhancement; the non-gesture path (tap → detail → delete) is the accessible path.

### Tab double-tap scroll-to-top — implementation

In the tab bar component (`TabBar.tsx`), track last-tap timestamp per tab:

```ts
const lastTap = useRef<Record<string, number>>({});

const handleTabTap = (tabId: string) => {
  const now = Date.now();
  if (now - (lastTap.current[tabId] ?? 0) < 300) {
    // double tap
    scrollTargets[tabId]?.current?.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    navigate(tabId);
  }
  lastTap.current[tabId] = now;
};
```

`scrollTargets` is a `Map<tabId, RefObject<HTMLElement>>` passed down from `App.tsx` — each screen's root scroll container registers its ref. On single tap within 300ms of a prior tap on the same tab: scroll to top, do not navigate (user is already on that tab).

### One-handed reach zones

Reference device: iPhone 14, 390×844px, safe area bottom inset ~34px.

```
Bottom 40% of screen = bottom 338px from screen bottom = y ≥ 506px from top

Allocation (bottom to top):
  34px    — safe area inset (nothing interactive)
  64px    — tab bar (.tab-bar, height: 64px)
  56px    — secondary link row (Back / Print / Make it mine)
  120px   — primary button area (.big-btn: 56px + 32px margin top + 32px margin bottom)
  64px    — remaining secondary content
  ──────
  338px   total (matches 40% of 844px)
```

All primary CTAs (Done ✓, Build Plan, Add to tonight's plan) must be positioned within the bottom 40% of the screen. Secondary links (undo, back) sit immediately above the primary button within the same reach zone. Content above y=506px (ingredient list, step list, NEXT panel) is read-only — no interactive elements that are not reachable from the bottom zone are primary actions.

### No-gesture-only rule

Enforcement checklist — for every gesture in the table above, a visible non-gesture alternative must exist in the same screen:

- Cook swipe left: Done ✓ button ✓
- Cook swipe right: ← Previous step link ✓
- Meals swipe left: tap card → detail → delete ✓
- Sheet swipe down: tap outside to close ✓ (X button added to all bottom sheets in V2)
- Tab double-tap: existing scroll behavior (user can scroll manually) ✓

## Data & Dependencies

- `useSwipe` hook — new file `packages/web/src/hooks/useSwipe.ts`
- `navigator.vibrate` — feature-detected
- `TabBar.tsx` — double-tap logic addition
- `CookScreen.tsx` — swipe handlers on NOW panel
- `MealHistoryCard.tsx` — swipe-to-delete reveal
- Bottom sheet components (passive steps sheet, library picker) — swipe-down-to-close
- `scrollTargets` refs — passed via context or prop drilling from `App.tsx` to `TabBar`
- No network calls, no engine calls

---

# 50 — Design Accessibility: WCAG AA Compliance Spec

## Overview

Tutti must meet WCAG 2.1 Level AA so it is usable by people with motor disabilities (large touch targets, full keyboard navigation), visual disabilities (sufficient color contrast, screen reader labels), and cognitive disabilities (no color-only information, consistent interaction patterns). This document specifies the compliance gaps found in the current codebase and the exact fixes required, rather than restating WCAG criteria abstractly.

## Current State

Files audited: `packages/web/src/index.css` (global styles), `packages/web/src/components/` (component styles), `packages/web/src/screens/` (screen layouts).

Confirmed existing: `data-theme` attribute drives CSS variables for light/dark mode. `--text` on `--bg` contrast ratio is 13.5:1 in light mode. `--muted` on `--bg` is 5.2:1 in light mode. Both pass AA (minimum 4.5:1 for normal text). `IngredientLegend` uses color dot + text label (not color alone). `role="progressbar"` exists on progress indicators (some). `aria-label` exists on some but not all interactive elements.

Confirmed non-compliant: `.mini-btn` (↑/↓ reorder buttons in Preview screen) — measured 28×28px in current CSS, below 44×44px minimum. `.seg-btn` (segmented control buttons — theme picker, allergen filter chips) — 32px height in current CSS. Tab bar buttons — no `aria-label`, icon only. Star rating input — no `aria-label` per star. Modal focus management — no `focus()` call on modal open. Dark mode color variables — unverified against contrast ratios.

## Problem

- A user with motor disabilities or large fingers cannot reliably tap the ↑/↓ reorder buttons (28px) or segmented control buttons (32px) — below the 44px WCAG 2.5.5 target size.
- A screen reader user navigating the tab bar hears nothing useful — the buttons have no accessible name.
- A screen reader user activating a modal (e.g., passive steps sheet, time picker) finds their focus does not move into the modal — they must search the page manually.
- When a modal closes, focus is lost (dropped to body) instead of returning to the trigger element.
- Star rating UI: five tappable elements with no aria-label mean a screen reader reads them as unlabeled buttons.
- Segmented controls (theme picker: light/dark/auto) have no group label — a screen reader reads three buttons with no context for what group they belong to.

## V2 Design

Fix all non-compliant elements with minimal visual change. The 44px touch target is achieved using padding expansion (visible element can remain smaller; the tap target is expanded via padding or a pseudo-element hit area). Color contrast in dark mode is verified and documented. Focus management is added to all modal open/close via a `useModal` hook. ARIA attributes follow WAI-ARIA patterns (tabs, radiogroup, progressbar).

The principle: accessibility fixes are additive (add padding, add aria attributes) — they do not require visual redesign except for the touch-target changes which may increase spacing slightly.

## Spec

### Touch targets — minimum 44×44px

**Rule**: every interactive element must have a tappable area of at least 44×44px. Prefer padding expansion over visual size increase to preserve existing design.

**`.mini-btn`** (↑/↓ reorder buttons, `PreviewScreen.tsx`):

Current: `width: 28px; height: 28px; padding: 4px`.  
Fix:
```css
.mini-btn {
  min-width: 44px;
  min-height: 44px;
  padding: 10px;      /* (44 - 24) / 2 = 10px each side */
  display: flex;
  align-items: center;
  justify-content: center;
}
```
The icon inside remains visually 24px; the tap area expands to 44×44px.

**`.seg-btn`** (segmented control buttons — theme picker, filter chips):

Current: `height: 32px; padding: 6px 12px`.  
Fix: `min-height: 44px; padding: 10px 12px`.

**Diet filter chips** in Home/Browse: same fix as `.seg-btn`.

**Allergen chips** in Recipe detail: `min-height: 44px` on the chip element; currently render as inline badges without tap behavior — if they become interactive (tap to filter) in V2, apply the fix then.

**Star rating buttons** (if rendered in Recipe detail or Meals history):  
Each star: `min-width: 44px; min-height: 44px; padding: 10px`.  
If five stars at 44px each would overflow at 390px width (5 × 44 = 220px — fine, 220 < 390), keep horizontal. If spacing is tight, reduce gap to 4px.

**Tab bar buttons**: currently `height: 64px` — already compliant. Width per tab = `390px / 4 tabs = 97.5px` — already compliant. No change needed.

### Color contrast

**Light mode — verified values:**

| Token | Hex | Background | Ratio | Pass AA |
|---|---|---|---|---|
| `--text` | `#2a1f0e` | `#fbf5ea` | 13.5:1 | ✓ |
| `--muted` | `#7a6450` | `#fbf5ea` | 5.2:1 | ✓ |
| `--accent` (buttons) | must verify | `--bg` | ≥ 3:1 (UI components) | check |

**Dark mode — values to verify and fix if needed:**

Dark mode CSS variables must be audited. Target values that must pass AA:

- `--text` on `--bg`: ≥ 4.5:1
- `--muted` on `--bg`: ≥ 4.5:1 (body text weight — if used for body text; 3:1 acceptable only for UI components and large text ≥ 18pt)
- Accent color on button background: ≥ 3:1 (UI component threshold)
- White text on `.badge--allergen` background: ≥ 4.5:1

Verification method: use `getComputedStyle` in browser DevTools → Elements → Computed → pick the token hex value → run through WebAIM Contrast Checker. Document results in a table in `packages/web/ACCESSIBILITY.md`.

If dark mode `--muted` fails: lighten to `#a89880` which targets ~5:1 on a dark background of `#1a120a`.

### Screen reader: ARIA attributes

**Tab bar buttons** — `TabBar.tsx`:

```tsx
<button
  aria-label={`${tab.label} tab`}
  aria-current={activeTab === tab.id ? "page" : undefined}
  onClick={() => handleTabTap(tab.id)}
>
  <tab.Icon />
</button>
```

`aria-current="page"` on the active tab communicates current location without requiring visual inspection.

**Star rating buttons** — wherever rendered:

```tsx
{[1,2,3,4,5].map(n => (
  <button
    key={n}
    aria-label={`Rate ${n} out of 5`}
    aria-pressed={rating >= n}
    onClick={() => setRating(n)}
  >
    {rating >= n ? "★" : "☆"}
  </button>
))}
```

Wrap in `<div role="group" aria-label="Recipe rating">`.

**Segmented controls** (theme picker, filter chips):

```tsx
<div role="group" aria-label="Theme">
  {["light","dark","auto"].map(t => (
    <button
      key={t}
      role="radio"                      /* or aria-pressed for toggle groups */
      aria-checked={theme === t}
      className={`seg-btn ${theme === t ? "seg-btn--active" : ""}`}
      onClick={() => setTheme(t)}
    >
      {t}
    </button>
  ))}
</div>
```

If using `role="radio"`, wrap must be `role="radiogroup"` not `role="group"`.

**Progress bars**: existing uses must have `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `role="progressbar"`, and `aria-label="Cooking progress"`. Audit all three progress contexts: cook-mode progress bar, recipe complexity indicator, onboarding step dots.

**Onboarding step dots**: currently render as visual dots only.

```tsx
<div role="tablist" aria-label="Onboarding steps">
  {slides.map((_, i) => (
    <button
      key={i}
      role="tab"
      aria-selected={i === currentSlide}
      aria-label={`Slide ${i + 1} of ${slides.length}`}
      onClick={() => setCurrentSlide(i)}
    />
  ))}
</div>
```

**Cook-screen Done button**: `aria-label="Complete this step"` (supplementary — button text is "Done ✓" which is sufficiently clear, but aria-label removes the emoji from the accessible name).

**Voice button in Cook**: `aria-label="Read step aloud"` — already specified in doc 46.

**Passive steps sheet** (bottom sheet): `role="dialog"`, `aria-modal="true"`, `aria-label="Passive steps running in background"`.

### Focus management — `useModal` hook

New hook: `packages/web/src/hooks/useModal.ts`.

```ts
export function useModal(isOpen: boolean, triggerRef: RefObject<HTMLElement>) {
  const firstFocusableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // After paint, move focus to first focusable element inside modal
      requestAnimationFrame(() => {
        firstFocusableRef.current?.focus();
      });
    } else {
      // Return focus to trigger
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  return firstFocusableRef;
}
```

Usage: every bottom sheet and modal in Tutti uses `useModal(isOpen, triggerRef)`. The `firstFocusableRef` is attached to the first button/input/link inside the sheet.

Modals that need this:
- Cook passive steps sheet (`CookPassiveSheet`)
- Library picker bottom sheet (Home screen — recipe selection)
- Time picker modal (serve-time chip)
- Any `<dialog>` or overlay rendered in V2

**Focus trap**: while a modal is open, Tab key must not move focus outside the modal. Implementation:

```ts
useEffect(() => {
  if (!isOpen) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, [isOpen]);
```

**Escape key closes modals**: `document.addEventListener("keydown", e => e.key === "Escape" && closeModal())` — added in `useModal`.

### No color-only information

Current compliance: `IngredientLegend` uses colored dot + text label — passes. Tier badges use background color + text label — passes. Diet chips use color + text label — passes.

Potential issue: passive step indicator in Cook mode uses a dot color. Fix: add text label "passive" in the passive indicator alongside any color cue.

Potential issue: the progress bar (thin line, color only). Fix: `aria-valuenow` on the progress element provides semantic information to screen readers. Visually, the progress is also communicated by step number text (e.g., "Step 3 of 7" — add this text visually near the progress bar, hidden from sighted users if needed via a visually-hidden class, but present in the DOM for screen readers).

Visually-hidden utility class (add to `index.css` if not present):

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Use for: step count label next to progress bar, supplementary instructions for gesture-only interactions.

### Keyboard navigation

All interactive elements are reachable by Tab. No interactive element uses `tabindex > 0` (forced tab order — breaks natural flow). Custom interactive elements (color dot, passive row) that are tappable must have `tabindex="0"` and respond to `Enter` and `Space` key events.

Swipe gestures have no keyboard equivalent — this is acceptable per WCAG 2.1 (pointer gestures must have alternatives, but pointer gestures are already covered by button alternatives per the no-gesture-only rule in doc 49).

## Data & Dependencies

- `index.css` — touch target fixes (`.mini-btn`, `.seg-btn`)
- `TabBar.tsx` — aria-label additions
- `StarRating.tsx` (new or existing) — aria-label per star
- `PreviewScreen.tsx` — `.mini-btn` height fix
- `useModal.ts` — new hook
- `CookPassiveSheet.tsx`, library picker, time picker — consume `useModal`
- `packages/web/ACCESSIBILITY.md` — contrast audit table (created by developer, not automated)
- No engine changes required
- No network calls required
- Tooltip system (doc 48) — tooltips must themselves be accessible: `role="tooltip"`, `aria-describedby` on the target element pointing to the tooltip id
