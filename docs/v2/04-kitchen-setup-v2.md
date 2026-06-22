# 04 — Kitchen Setup V2

## Overview

KitchenScreen captures the user's physical cooking environment — hob count, oven availability, equipment, and allergens — so the compile engine can build a realistic parallel schedule. It acts as a one-time calibration step: the engine cannot avoid scheduling two high-heat steps simultaneously without knowing how many hobs are available, and it cannot flag allergen-containing dishes without knowing the user's restrictions. In V2, this screen becomes optional at first launch while remaining fully accessible from Settings, reducing the barrier to a user's first cook session.

## Current State

**File:** `apps/web/src/screens/KitchenScreen.tsx`
**Model:** `packages/engine/src/kitchenModel.ts` — `KitchenUi` type (`hobs`, `oven`, `equipment`, `allergens`)
**Storage:** `localStorage` key `tutti.kitchen` (JSON-serialised `KitchenUi`)

What works today:
- Four field groups render and persist correctly: hob count (numeric input), oven toggle, equipment checkboxes, allergen checkboxes.
- On submit the user lands on `home`.
- When opened from Settings, `prevScreen` tracking (fixed in `App.tsx`) causes Back to return to Settings rather than to onboarding.

What is missing or broken:
- No way to skip — a user who wants to cook immediately must fill in the form first.
- No contextual explanation for any field. Users do not know why hob count matters, so they may guess or abandon.
- No visual distinction for allergens despite them affecting recipe visibility — they appear identical to equipment checkboxes.
- `KitchenUi` has no `skipped` flag, so downstream code cannot distinguish "user deliberately left fields empty" from "user has not set up kitchen at all".

## Problem

From a first-time user's perspective:

1. **Mandatory friction before first cook.** A user who opens Tutti after onboarding cannot reach the home screen without completing kitchen setup. If they are cooking solo on a single hob and have no allergens, the form feels like bureaucracy before they have seen the product work.
2. **No explanation of why fields exist.** "Number of hobs" looks like a trivia question. Without knowing that Tutti uses it to serialise concurrent high-heat steps, users enter random values or round numbers that do not reflect their actual setup.
3. **Allergens buried in visual noise.** The allergen section uses the same checkbox style as equipment. A user with a nut allergy who rushes through the screen may not register how consequential those checkboxes are.
4. **No escape hatch.** A returning user who opens the app on a device where `tutti.kitchen` is missing (cleared storage, new device) is blocked from cooking until they re-complete the form.

## V2 Design

**Make setup skippable.** A "Skip for now" link at the bottom of the form lets the user bypass kitchen setup entirely. Skipping sets `tutti.kitchen.skipped = true` and navigates to `home`. The engine still compiles a plan using safe defaults (2 hobs, no oven, no equipment, no allergens) so the first cook session still works — it just may be less optimised.

**Surface the benefit later, not as a gate.** Rather than blocking the user, a soft nudge banner on the Home screen prompts them to return to kitchen setup once they have seen the app work. The banner is shown a maximum of three times and is dismissed permanently after that or when the user taps "Set up now".

**Add context copy per field.** Each field group gains one sentence of plain-English rationale directly beneath its label. Users who understand why a field exists fill it in more accurately — and are less likely to skip.

**Elevate allergens visually.** The allergen group receives a yellow-amber left border and a label ("Important — affects which recipes you see") to signal that this section has downstream consequences beyond schedule optimisation.

**Back from Settings already works.** The `prevScreen` fix in `App.tsx` means that when the user opens KitchenScreen from Settings, Back correctly returns to Settings. No additional navigation logic is required; this document records that the behaviour is intentional and tested.

## Spec

### `KitchenUi` type (`packages/engine/src/kitchenModel.ts`)

Add optional `skipped` field:

```ts
export interface KitchenUi {
  hobs: number;
  oven: boolean;
  equipment: string[];
  allergens: string[];
  skipped?: boolean;   // true when user has tapped "Skip for now"
}
```

Default value used by the engine when `skipped` is `true` or kitchen has never been set: `{ hobs: 2, oven: false, equipment: [], allergens: [], skipped: true }`.

### Skip flow (`KitchenScreen.tsx`)

- Render a `<button className="kitchen-skip-link">Skip for now</button>` below the primary "Save kitchen" CTA.
- On click: call `setKitchen({ ...currentKitchen, skipped: true })`, then `navigate('home')`.
- If the user later completes the form properly, saving clears the `skipped` flag: `setKitchen({ ...formValues, skipped: false })`.
- The skip button must not appear when `prevScreen === 'settings'` (the user navigated here intentionally to edit, not as a first-run gate).

### Context copy per field group

| Field | Copy (renders as `<p className="kitchen-field-hint">`) |
|---|---|
| Number of hobs | "Tutti uses this to avoid scheduling two high-heat steps at the same time." |
| Oven | "Enables oven-based steps in your schedule." |
| Equipment | "Steps requiring unlisted equipment are automatically removed from your plan." |
| Allergens | "Tutti flags recipes containing these ingredients — you will still see them but they will be highlighted." |

### Allergen group styling

Wrap the allergen checkbox group in `<div className="kitchen-allergen-group">`. CSS:

```css
.kitchen-allergen-group {
  border-left: 3px solid var(--color-warning, #f59e0b);
  padding-left: 12px;
}

.kitchen-allergen-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-warning, #f59e0b);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
```

Above the allergen checkboxes, render: `<span className="kitchen-allergen-label">Important — affects which recipes you see</span>`.

### `KitchenNudgeBanner` component (`apps/web/src/components/KitchenNudgeBanner.tsx`)

**Render condition:** `kitchenSkipped === true && cookCount === 0`

**Dismiss logic:**
- `localStorage` key: `tutti.kitchenNudgeDismissed` — stores an integer dismiss count.
- Banner renders only when dismiss count is less than 3.
- On "×" tap: increment dismiss count in storage; remove banner from DOM.
- On "Set up now" tap: navigate to `kitchen` screen (prevScreen is set to `home` so Back returns correctly).

**Props:**
```ts
interface KitchenNudgeBannerProps {
  onSetup: () => void;       // navigate('kitchen') with prevScreen='home'
  onDismiss: () => void;     // increment localStorage counter, hide banner
}
```

**Markup:**
```tsx
<div className="kitchen-nudge-banner" role="status">
  <span className="kitchen-nudge-text">
    Tell Tutti about your kitchen for a smarter schedule
  </span>
  <button className="kitchen-nudge-cta" onClick={onSetup}>
    Set up now
  </button>
  <button className="kitchen-nudge-dismiss" aria-label="Dismiss" onClick={onDismiss}>
    ×
  </button>
</div>
```

**CSS** (tokens from existing theme):
```css
.kitchen-nudge-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin: 0 16px 12px;
  font-size: 0.875rem;
}

.kitchen-nudge-cta {
  margin-left: auto;
  color: var(--color-accent);
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}

.kitchen-nudge-dismiss {
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
}
```

**Placement in `HomeScreen.tsx`:** render `<KitchenNudgeBanner>` as the first child inside the home screen scroll container, above the meal-plan section. It should be invisible to the layout flow once dismissed (use conditional rendering, not `visibility: hidden`).

### Storage keys summary

| Key | Type | Purpose |
|---|---|---|
| `tutti.kitchen` | JSON (`KitchenUi`) | Persisted kitchen configuration including `skipped` flag |
| `tutti.kitchenNudgeDismissed` | Integer (string-stored) | How many times the nudge banner has been dismissed |

### Edge cases

- **New device / cleared storage:** `tutti.kitchen` absent → treat as `skipped: true` with defaults. Nudge banner renders on first home visit.
- **User fills form then later skips on a different entry:** `skipped` flag is set to `false` whenever `Save kitchen` is submitted with valid data.
- **`cookCount` source:** read from `tutti.cookHistory` length in `localStorage` (same source used by the stats screen). If `tutti.cookHistory` is absent, treat as 0 — banner shows.
- **Screen reader:** the nudge banner uses `role="status"` so assistive technology announces it without stealing focus.
- **Banner + allergen contrast:** both use `--color-warning` (`#f59e0b`). Verify contrast ratio against `--color-surface-raised` background meets WCAG AA for non-text (3:1) — amber on light surfaces passes; on dark surfaces, test and adjust to `#fbbf24` if needed.

## Data & Dependencies

| Dependency | Detail |
|---|---|
| `KitchenUi` | `packages/engine/src/kitchenModel.ts` — add `skipped?: boolean` |
| `compile()` | `packages/engine/src/compiler.ts` — already accepts `KitchenUi`; safe defaults already apply when fields are zero/false; no change needed |
| `App.tsx` screen router | Reads `prevScreen` to wire Back on KitchenScreen; no change needed |
| `HomeScreen.tsx` | Mounts `KitchenNudgeBanner`; reads `kitchen.skipped` and `cookCount` |
| `SettingsScreen.tsx` | "Kitchen setup" list item navigates to `kitchen`; sets `prevScreen = 'settings'`; no change needed |
| `localStorage tutti.kitchen` | Source of truth for `skipped` flag |
| `localStorage tutti.kitchenNudgeDismissed` | Nudge dismiss counter; initialised to `0` on first read |
| `localStorage tutti.cookHistory` | Source for `cookCount`; drives nudge render condition |
| Allergen filter logic | `apps/web/src/lib/dietFilter.ts` (or equivalent) — already reads `kitchen.allergens`; no change needed |
