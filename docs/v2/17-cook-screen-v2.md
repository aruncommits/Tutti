# 17 — Cook Screen V2

## Overview

The Cook Screen is the terminal destination of the Tutti workflow — it takes a compiled MasterExecutionPlan and walks the user through every step in the correct sequence so that all dishes land on the table simultaneously. It is the moment where all prior planning pays off, and the UI must disappear into the background: no clutter, no decisions, just the next action. V2 sharpens this by enlarging the active step, collapsing ambient information, and adding a post-cook rating screen so the session ends with a clean loop close rather than an abrupt return to Home.

## Current State

File: `apps/web/src/screens/CookScreen.tsx`

The screen receives the compiled `MasterExecutionPlan` (produced by `compile()` from `@tutti/engine`) and iterates through `schedule[]` in order. It is divided into three panels rendered in a vertical stack:

- **NOW panel** — displays the current step's full instruction text, a countdown timer (per-step `durationSec`), and Complete / Undo buttons. Step number shown as "Step N of M".
- **NEXT panel** — shows the next step's full instruction text in a visually lighter style.
- **PASSIVE panel** — lists all currently-running passive/hands-free steps (e.g. "Simmer dal — 18 min remaining") as a flat visible list at all times.
- **Voice button** — a labelled button that calls `window.speechSynthesis.speak()` with the current step text.
- **Screen wake lock** — acquired on mount via the WakeLock API, released on unmount. Persists across step advances.
- **Finish button** — appears on the last step; pressing it navigates back to Home.

What works: step sequencing, timer countdown, SpeechSynthesis read-aloud, wake lock acquisition and release, complete/undo, passive step tracking.

What is missing or broken:
- Font size is 1.25rem for step text — too small when hands are wet and the phone is on a counter.
- NEXT panel shows the full instruction — unnecessary cognitive load while executing the current step.
- PASSIVE steps are always expanded — they consume vertical space even when the user has nothing to act on.
- Voice is a labelled text button, not an icon — takes up layout space disproportionate to its use frequency.
- Step number ("Step 4 of 12") is displayed in the NOW panel — adds noise; a progress bar communicates the same information more passively.
- No session resume: if the app is backgrounded, the browser may discard state, and there is no mechanism to restore the user to their current step index.
- No finish / rating screen: the session ends by navigating back to Home with no acknowledgement, no rating capture, and no note-taking.
- `recipeNotes` storage key exists in localStorage but is never populated from the Cook screen.

## Problem

From a real user's perspective:

1. **Unreadable at arm's length.** Step text at 1.25rem requires the user to lean toward the screen. In a kitchen with wet hands, greasy fingers, or a phone propped on a shelf, this fails immediately.
2. **NEXT panel is too detailed.** Seeing a full instruction for the step you are not yet doing splits attention. The user cannot finish the current step faster by reading the next one.
3. **Passive steps crowd the screen.** Four passive steps listed at full height push the Complete button out of the thumb zone on any phone with a smaller viewport.
4. **Session loss on backgrounding.** Switching to a recipe app to check a sub-recipe, taking a call, or the browser garbage-collecting the tab all destroy cook state. There is no way back except restarting the whole plan.
5. **No closure.** The cook session ends with a silent redirect. There is no moment of acknowledgement, no way to note what went wrong or what to repeat, and no signal to the user that their rating data will influence future recommendations.

## V2 Design

**NOW panel enlargement.** Step instruction text increases from 1.25rem to 1.5rem, with a generous line-height (1.6). The step number label is removed; a thin progress bar at the top of the screen carries that information non-intrusively. This reclaims vertical space for text.

**NEXT panel simplification.** Only the step title (the short label already present on every `RecipeGraph` node) is shown, prefixed with "Coming up:" in a muted colour. Full instruction text is withheld until the step becomes active. This reduces the NEXT panel to a single line.

**PASSIVE panel collapse.** The panel renders as a collapsed pill by default: "2 hands-free steps running ▾". Tapping it expands to show the list inline. A user who has already registered that something is simmering does not need to see it on every step.

**Voice as icon button.** The read-aloud trigger moves to a microphone icon (`🎙`) in the top-right corner of the screen, positioned outside the step content area. It taps the current step instruction into SpeechSynthesis unchanged. Removing the labelled button from the content flow frees vertical space for step text.

**Timer as primary visual.** The countdown moves to a large centred digital display below the step text (font-size ~2.5rem, monospaced). Format is `MM:SS` for durations under an hour and `H:MM:SS` for longer steps. This makes timer state legible from across a kitchen counter.

**Complete and Undo.** "Done ✓" is a full-width primary button fixed at the bottom of the viewport, in the natural thumb zone. "← Back" is a small secondary text link centred below it. On the last step the Complete button is replaced by "Finish cooking 🎉" in an accented colour.

**Session guard.** On cook start, `cookStartedAt` (ISO timestamp) and `cookStepIndex` (integer) are written to `localStorage`. `cookStepIndex` is updated on every step advance. On mount, `CookScreen` reads these keys: if `cookStartedAt` is set and a valid plan is in memory, the screen restores to the stored step index and prompts "Resuming your cook session" for two seconds before continuing. If no plan is in memory (page reload), the screen redirects to Home with a toast: "Your session expired — plan your meal again."

**Finish / rating screen.** Introduced as a new `Screen` value `"finish"` handled in `App.tsx`. It is reached only from the Cook screen's final step. It is not a tab and has no bottom navigation bar.

The decision to make `"finish"` a proper screen (rather than a modal overlaid on Cook) is intentional: the cook session is over, the plan is complete, and the user should feel they have crossed a threshold. A modal implies "still cooking".

**No navigation bar on Cook or Finish.** Both screens suppress the bottom tab bar. Cook has always done this; Finish inherits the same treatment.

## Spec

### Progress bar

```
<div class="cook-progress-bar">
  <div class="cook-progress-fill" style={{ width: `${(stepIndex / totalSteps) * 100}%` }} />
</div>
```

- Height: 3px, full screen width, pinned to the very top of the viewport (position: fixed, z-index above panel content).
- Fill colour: `var(--color-primary)`.
- No label text, no percentage number.

### NOW panel

Component: `NowPanel` (extracted from `CookScreen.tsx`).

Props:
```ts
interface NowPanelProps {
  step: ScheduledStep;
  timeRemainingMs: number;
  onComplete: () => void;
  onUndo: () => void;
  onSpeak: () => void;
  isLastStep: boolean;
}
```

Layout (top to bottom within the panel):
1. Dish name in small caps, muted colour (`step.recipeName`) — one line.
2. Step instruction text — `font-size: 1.5rem`, `line-height: 1.6`, `font-weight: 500`.
3. Timer display (see Timer section below).
4. Coming-up line (see NEXT panel section).
5. Passive pill (see PASSIVE section).

Voice button: absolutely positioned top-right of the screen, 44×44px touch target, icon only.

### Timer display

Component: `StepTimer`.

Props:
```ts
interface StepTimerProps {
  durationSec: number;
  timeRemainingMs: number;
}
```

- Renders as `MM:SS` when `durationSec < 3600`, else `H:MM:SS`.
- Font: system monospace stack (`'Courier New', Courier, monospace`) or a project monospace variable if one exists.
- Font size: `2.5rem`.
- Centred horizontally.
- When `timeRemainingMs <= 10_000`: text colour transitions to `var(--color-warning, #f59e0b)` — no animation, just colour change.
- When `timeRemainingMs <= 0`: displays `00:00` and does not go negative.
- Steps with no timer (`durationSec === 0` or `null`): timer is hidden entirely; no empty space reserved.

### NEXT panel

Rendered inline below the timer, above the passive pill.

```tsx
{nextStep && (
  <p class="cook-next-preview">
    Coming up: <span class="cook-next-title">{nextStep.title}</span>
  </p>
)}
```

CSS:
- `cook-next-preview`: `font-size: 0.85rem`, `color: var(--color-text-muted)`, `margin-top: 1rem`.
- `cook-next-title`: `font-weight: 600`, same colour.
- If there is no next step (current is last): element is not rendered.

### PASSIVE panel

Component: `PassivePill`.

Props:
```ts
interface PassivePillProps {
  passiveSteps: ActivePassiveStep[];  // steps currently running in background
}

interface ActivePassiveStep {
  title: string;
  recipeName: string;
  timeRemainingMs: number;
}
```

State:
```ts
const [expanded, setExpanded] = useState(false);
```

Collapsed render (default):
```
"2 hands-free steps running ▾"
```
- `font-size: 0.85rem`, `color: var(--color-text-muted)`.
- Tapping toggles `expanded`.
- If `passiveSteps.length === 0`: renders `null`.

Expanded render: an inline list, one row per step:
```
• Simmer dal   4:32 remaining
• Rest dough   11:08 remaining
```
- Rows formatted as `{step.recipeName}: {step.title}` + right-aligned timer.
- Tapping the pill header again collapses.

### Complete / Undo buttons

Fixed to the bottom of the viewport, above the safe-area inset (CSS `padding-bottom: env(safe-area-inset-bottom)`).

```tsx
<div class="cook-actions">
  {isLastStep
    ? <button class="cook-btn-finish" onClick={onFinish}>Finish cooking 🎉</button>
    : <button class="cook-btn-complete" onClick={onComplete}>Done ✓</button>
  }
  {stepIndex > 0 && (
    <button class="cook-btn-undo" onClick={onUndo}>← Back</button>
  )}
</div>
```

CSS:
- `cook-actions`: `position: fixed; bottom: 0; left: 0; right: 0; padding: 1rem 1.5rem; padding-bottom: calc(1rem + env(safe-area-inset-bottom)); background: var(--color-surface); border-top: 1px solid var(--color-border);`
- `cook-btn-complete`: full-width, `height: 52px`, `font-size: 1.1rem`, primary fill colour.
- `cook-btn-finish`: same dimensions, accent colour (`var(--color-accent, #10b981)`).
- `cook-btn-undo`: full-width, text link style, `font-size: 0.85rem`, `margin-top: 0.5rem`, no border, `color: var(--color-text-muted)`.

### Session guard

On cook session start (when `compile()` result is accepted and user presses "Start cooking" from Preview):

```ts
localStorage.setItem('tutti.cookStartedAt', new Date().toISOString());
localStorage.setItem('tutti.cookStepIndex', '0');
```

`CookScreen` mount logic:

```ts
useEffect(() => {
  const savedIndex = localStorage.getItem('tutti.cookStepIndex');
  const savedAt = localStorage.getItem('tutti.cookStartedAt');

  if (!plan) {
    // No plan in memory — page was reloaded or state was lost
    if (savedAt) {
      showToast('Your session expired — plan your meal again.');
    }
    navigate('home');
    return;
  }

  if (savedIndex !== null) {
    const idx = parseInt(savedIndex, 10);
    if (idx > 0 && idx < plan.schedule.length) {
      setStepIndex(idx);
      setResuming(true);
      setTimeout(() => setResuming(false), 2000);
    }
  }
}, []);
```

`resuming` state renders a banner:
```tsx
{resuming && <div class="cook-resume-banner">Resuming your cook session</div>}
```

On every step advance:
```ts
localStorage.setItem('tutti.cookStepIndex', String(newIndex));
```

On finish (navigate to `"finish"` screen):
```ts
localStorage.removeItem('tutti.cookStartedAt');
localStorage.removeItem('tutti.cookStepIndex');
```

### Voice button

```tsx
<button
  class="cook-voice-btn"
  aria-label="Read step aloud"
  onClick={onSpeak}
>
  🎙
</button>
```

CSS:
- `position: fixed; top: 1rem; right: 1rem;`
- `width: 44px; height: 44px;`
- `border-radius: 50%;`
- `background: var(--color-surface-raised);`
- `border: 1px solid var(--color-border);`
- `font-size: 1.25rem;`
- `display: flex; align-items: center; justify-content: center;`

`onSpeak` implementation (unchanged from current):
```ts
const speak = () => {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(currentStep.instruction);
  window.speechSynthesis.speak(utterance);
};
```

---

### Finish Screen

New screen value added to `Screen` union in `state.ts`:
```ts
| 'finish'
```

Added to `SCREENS` set in `validators.ts`:
```ts
'finish',
```

New branch in `App.tsx`:
```tsx
case 'finish':
  return <FinishScreen plan={plan} onDone={() => navigate('home')} />;
```

Component: `apps/web/src/screens/FinishScreen.tsx`

Props:
```ts
interface FinishScreenProps {
  plan: MasterExecutionPlan;
  onDone: () => void;
}
```

State:
```ts
interface DishReview {
  recipeId: string;
  stars: 1 | 2 | 3 | 4 | 5 | null;
  note: string;
}

const [reviews, setReviews] = useState<DishReview[]>(
  plan.recipes.map(r => ({ recipeId: r.recipeId, stars: null, note: '' }))
);
```

Layout:

```
[top]
"You cooked it!" — large heading, centred
"How did it go?" — subheading, muted

[for each dish in plan.recipes]
  Dish name (bold)
  ★ ★ ★ ★ ★  (5 tappable stars, selected state fills star)
  <textarea placeholder="Any notes? (optional)" rows=2 />

[bottom, fixed]
[Save & finish]
```

Star rating component: `StarRating`.

```ts
interface StarRatingProps {
  value: number | null;
  onChange: (stars: 1 | 2 | 3 | 4 | 5) => void;
}
```

Renders five `<button>` elements with `aria-label="N stars"`. Selected stars use `color: var(--color-accent)`. Unselected use `color: var(--color-border)`.

Save handler:

```ts
const handleSave = () => {
  const existing = JSON.parse(localStorage.getItem('tutti.recipeNotes') ?? '{}');
  reviews.forEach(r => {
    if (r.stars !== null || r.note.trim()) {
      existing[r.recipeId] = {
        stars: r.stars,
        note: r.note.trim(),
        cookedAt: new Date().toISOString(),
      };
    }
  });
  localStorage.setItem('tutti.recipeNotes', JSON.stringify(existing));
  // cook session keys already cleared on transition from Cook screen
  onDone();
};
```

Skip path: a small "Skip" text link in the top-right corner calls `onDone()` directly without writing to `recipeNotes`.

Bottom nav bar: hidden on this screen (same suppression logic as Cook screen — no `<BottomNav />` rendered in the `"finish"` branch of `App.tsx`).

---

## Data & Dependencies

| Data | Source | Notes |
|---|---|---|
| `MasterExecutionPlan` | Produced by `compile()` in `@tutti/engine`, held in React state | Passed as prop to both `CookScreen` and `FinishScreen` |
| `plan.schedule[]` | `MasterExecutionPlan.schedule` | Each entry is a `ScheduledStep` with `recipeName`, `title`, `instruction`, `durationSec`, `isPassive`, `startOffset` |
| `cookStartedAt` | `localStorage` key `tutti.cookStartedAt` | Set on cook start, cleared on finish |
| `cookStepIndex` | `localStorage` key `tutti.cookStepIndex` | Updated on every step advance |
| `recipeNotes` | `localStorage` key `tutti.recipeNotes` | Written only from `FinishScreen`; read by Stats screen for history display |
| Wake lock | `navigator.wakeLock.request('screen')` | Acquired in `CookScreen` on mount; released on unmount; not relevant to `FinishScreen` |
| SpeechSynthesis | `window.speechSynthesis` | Used in `CookScreen` voice button only |

Screens that must be updated:

- `state.ts` — add `'finish'` to `Screen` union.
- `validators.ts` — add `'finish'` to `SCREENS` set.
- `App.tsx` — add `case 'finish'` branch; suppress `<BottomNav />` for both `cook` and `finish`.
- `PreviewScreen.tsx` — the "Start cooking" button sets the two `localStorage` session keys before navigating to `'cook'`.
- `StatsScreen.tsx` — reads `recipeNotes` to display cook history; no structural changes needed, but the new `cookedAt` + `stars` shape should be validated defensively if the schema was previously undefined.

New files:

- `apps/web/src/screens/FinishScreen.tsx`
- `apps/web/src/components/cook/NowPanel.tsx`
- `apps/web/src/components/cook/StepTimer.tsx`
- `apps/web/src/components/cook/PassivePill.tsx`
- `apps/web/src/components/cook/StarRating.tsx`

Existing file modified:

- `apps/web/src/screens/CookScreen.tsx` — refactored to use the new sub-components; session guard added; voice button repositioned; step number label removed; progress bar added.
