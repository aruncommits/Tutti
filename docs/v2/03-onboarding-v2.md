# 03 — Onboarding V2

## Overview

The onboarding flow is the first thing a new user sees when they open Tutti. Its job is to demonstrate the product's core mechanic — the parallel cooking timeline — so the user understands the value before they commit to any setup. It runs exactly once, gated by a `localStorage` flag, and ends with a routing decision: go straight to cooking, or configure the kitchen first. V2 replaces a static feature-list approach with a show-don't-tell sequence that puts the Cook screen front and center before the user has cooked a single dish.

## Current State

**File:** `apps/web/src/screens/OnboardingScreen.tsx`

Three slides are implemented:

- Slide 1: "Welcome to Tutti" with a generic tagline.
- Slide 2: A bulleted list of features (parallel planning, grocery lists, cook mode, etc.).
- Slide 3: "Set up your kitchen" — a form-entry prompt. CTA: "Set up my kitchen".

The `onComplete` callback (current signature: `onComplete(): void`) routes unconditionally to the kitchen screen (`Screen = "kitchen"`). The `onboarded` flag is written to `localStorage` before calling `onComplete`. Swipe navigation is not implemented; forward/back is button-only. There is no skip affordance.

**What works:** The flag write, the routing hook in App.tsx, and the slide index state are all functional.

**What is broken or missing:**

- No swipe gesture support.
- Kitchen setup is presented as mandatory — there is no escape path to `home`.
- No visual demonstration of the cook screen or the Gantt timeline.
- `onComplete` does not carry a `skipKitchen` parameter, so App.tsx cannot branch.

## Problem

From a new user's perspective:

1. The first thing they see is a tagline, not a product. They cannot tell what "parallel cooking" means or looks like from words alone.
2. The feature list on slide 2 reads like marketing copy, not a demonstration. It does not answer "what will I actually be doing on this screen?"
3. The final slide creates a commitment barrier: the only exit is "Set up my kitchen," which implies the app will not work without configuration. Users who open the app to cook tonight, not to configure equipment, are immediately stalled.
4. There is no way to skip ahead on slides 1 or 2 — a returning device (e.g., reinstall) or a fast user must tap through all three slides.
5. The app's most distinctive UI — the Cook screen with its NOW/NEXT panels and the Gantt Gantt chart on Preview — is never shown during onboarding.

## V2 Design

**Principle:** Show the product, not a pitch. Every slide must make the user more confident they can cook something tonight.

**Three slides, strictly visual-first:**

**Slide 1 — "Cook smarter tonight"**
Hero: an inline Gantt timeline graphic rendering three dishes (e.g., Rice, Chicken Curry, Raita) with their bars finishing at a common vertical "Serve" line. This is a real SVG render, not a screenshot, so it respects the active theme. Copy below the hero: "Pick your dishes. Tutti works out who does what and when — so everything finishes together." CTA button: "See how it works →".

**Slide 2 — "Every step, at a glance"**
Hero: a static screenshot (PNG, two versions: light/dark, selected via `data-theme`) of the Cook screen showing the NOW panel with a single active step, the NEXT panel with the upcoming step, and a visible countdown timer. Copy: "Step-by-step instructions that know what's on your stove right now. No more juggling." CTA button: "One more thing →".

**Slide 3 — "Ready when you are"**
No hero image — full attention on the decision. Copy: "You can start cooking right now — no setup needed. Tell Tutti about your kitchen later for a smarter schedule." Two CTAs stacked vertically: primary button "Start cooking" (routes to home, `skipKitchen: true`), secondary ghost button "Set up kitchen first" (routes to kitchen, `skipKitchen: false`).

**Navigation model:** Dot indicator (3 dots, filled circle = current slide, unfilled = other). Tap any dot to jump directly. Swipe left to advance, swipe right to go back; 30% of viewport width is the gesture threshold. No progress bar.

**Skip affordance:** A "Skip" text button is fixed top-right on slides 1 and 2. It behaves identically to "Start cooking" on slide 3 (`skipKitchen: true`). Slide 3 has no skip button because the two CTAs already cover both paths.

**Why not merge slide 3 into slide 2:** Mixing a navigation decision with content makes users feel rushed. Slide 3 is intentionally sparse so the two paths read clearly.

## Spec

### Component

**`OnboardingScreen`**

```
props:
  onComplete: (skipKitchen: boolean) => void
```

App.tsx call site (update required):

- When `onComplete(true)` fires: set screen to `"home"`.
- When `onComplete(false)` fires: set screen to `"kitchen"`.

### State (internal)

```
slideIndex: 0 | 1 | 2          // current slide, default 0
```

No other internal state required. The `onboarded` flag is written to `localStorage` (`tutti.onboarded = "true"`) immediately before any `onComplete` call, whether via skip, "Start cooking", or "Set up kitchen first".

### Slide definitions (static data, colocated in OnboardingScreen.tsx)

```ts
type SlideConfig = {
  id: "show-timeline" | "show-cook" | "ready";
  heading: string;
  body: string;
  hero: "gantt-demo" | "cook-screenshot" | null;
  cta: string;           // primary CTA label
  ctaSkipKitchen: boolean;
  showSkip: boolean;
};
```

Slides array:

| id | heading | hero | cta | ctaSkipKitchen | showSkip |
|---|---|---|---|---|---|
| show-timeline | Cook smarter tonight | gantt-demo | See how it works → | true (advance only) | true |
| show-cook | Every step, at a glance | cook-screenshot | One more thing → | true (advance only) | true |
| ready | Ready when you are | null | Start cooking | true | false |

Slides 1 and 2 CTAs advance to the next slide; they do not call `onComplete`. Only "Start cooking" and "Set up kitchen first" call `onComplete`.

### Hero components

**`<GanttDemoGraphic />`** (new component, `src/components/onboarding/GanttDemoGraphic.tsx`)

- Pure SVG, no external data dependency.
- Hard-coded demo data: three dishes ("Rice", "Chicken Curry", "Raita"), each with 2–3 bar segments, all bars ending at a shared rightmost x position representing serve time.
- Reads `document.documentElement.dataset.theme` (or a prop `theme: "light" | "dark"`) to select stroke and fill colors from a small local palette that mirrors the app's CSS custom properties (`--color-primary`, `--color-surface`, `--color-text`).
- Width: 100% of container. Height: fixed at 160px.
- Accessibility: `role="img"` with `aria-label="Gantt chart showing three dishes finishing at the same time"`.
- Not animated — static render. Animation may be added in a future pass but is not in scope for V2.

**Cook screen screenshots**

- Two static PNG assets: `src/assets/onboarding/cook-light.png`, `src/assets/onboarding/cook-dark.png`.
- Selected in JSX: `const src = theme === "dark" ? cookDark : cookLight`.
- `alt="Cook screen showing active step and next step panels"`.
- Object-fit: contain, max-height: 240px.

Screenshots are produced once from the live app at 390×844px (iPhone 14 viewport) and committed as static assets. They are not generated at runtime.

### Gesture handling

Touch events on the slide container (`div.onboarding-slide-area`):

```
onTouchStart: record touchStartX
onTouchEnd:   delta = touchEndX - touchStartX
              threshold = window.innerWidth * 0.30
              if delta < -threshold && slideIndex < 2 → setSlideIndex(i + 1)
              if delta > +threshold && slideIndex > 0 → setSlideIndex(i - 1)
```

No momentum or rubber-band animation required in V2. Transition between slides: CSS `translateX` with `transition: transform 200ms ease-out`.

### Dot indicator

```tsx
<div className="onboarding-dots" role="tablist" aria-label="Slide indicator">
  {[0, 1, 2].map(i => (
    <button
      key={i}
      role="tab"
      aria-selected={slideIndex === i}
      aria-label={`Slide ${i + 1}`}
      className={slideIndex === i ? "dot dot--active" : "dot"}
      onClick={() => setSlideIndex(i)}
    />
  ))}
</div>
```

CSS: `.dot` is 8px circle, `background: var(--color-text-muted)`. `.dot--active` is 10px circle, `background: var(--color-primary)`. Transition: `width/height 150ms ease`.

### Skip button (slides 1 and 2)

```tsx
{slide.showSkip && (
  <button className="onboarding-skip" onClick={handleComplete(true)}>
    Skip
  </button>
)}
```

Position: `position: absolute; top: 16px; right: 16px`. No icon — text only. Uses `--color-text-muted` color, no border, no background.

### Slide 3 dual CTAs

```tsx
<button className="btn btn--primary btn--full" onClick={handleComplete(true)}>
  Start cooking
</button>
<button className="btn btn--ghost btn--full" onClick={handleComplete(false)}>
  Set up kitchen first
</button>
```

Stacked with `gap: 12px`. "Set up kitchen first" sits below "Start cooking" so the default eye path favors the skip path.

### `handleComplete`

```ts
const handleComplete = (skipKitchen: boolean) => () => {
  localStorage.setItem("tutti.onboarded", "true");
  onComplete(skipKitchen);
};
```

### CSS classes (additions to existing stylesheet or new `onboarding.css`)

| Class | Purpose |
|---|---|
| `.onboarding-screen` | Full-viewport flex column, `justify-content: space-between` |
| `.onboarding-slide-area` | Takes remaining height; overflow hidden; relative positioning for touch target |
| `.onboarding-slide` | Full width; flex column; `align-items: center`; `gap: 24px`; padding `0 24px` |
| `.onboarding-hero` | Max-height constraint container for graphic/screenshot |
| `.onboarding-heading` | `font-size: var(--text-2xl); font-weight: 700; text-align: center` |
| `.onboarding-body` | `font-size: var(--text-base); color: var(--color-text-muted); text-align: center; max-width: 320px` |
| `.onboarding-cta-area` | Padding `0 24px 40px`; flex column; gap 12px |
| `.onboarding-dots` | Flex row; gap 8px; justify-content center; padding `16px 0` |
| `.dot` | 8px × 8px; border-radius 50%; cursor pointer; border none |
| `.dot--active` | 10px × 10px; background `var(--color-primary)` |
| `.onboarding-skip` | Absolute top-right; background none; border none; cursor pointer; `color: var(--color-text-muted); font-size: var(--text-sm)` |

### localStorage keys touched

| Key | Value | Written by |
|---|---|---|
| `tutti.onboarded` | `"true"` | `handleComplete` — before routing |

No other keys are written or read during onboarding. Kitchen config keys (`tutti.kitchen.*`) are untouched by this flow.

### Accessibility

- The slide container has `aria-live="polite"` so screen readers announce the new heading when the slide changes.
- All interactive elements (dots, skip, CTAs) are native `<button>` elements with visible focus rings (`outline: 2px solid var(--color-primary)`).
- Hero images and SVG have descriptive `alt` / `aria-label` text.
- Minimum tap target size: 44×44px for all buttons.

## Data & Dependencies

**Reads:**

- `localStorage["tutti.onboarded"]` — checked in App.tsx before rendering OnboardingScreen; if already `"true"`, skip directly to home. OnboardingScreen itself does not read this key.
- `document.documentElement.dataset.theme` — read by `GanttDemoGraphic` and the cook screenshot selector to pick the correct visual variant.

**Writes:**

- `localStorage["tutti.onboarded"] = "true"` — written once, immediately before `onComplete` fires.

**Routing dependencies (App.tsx):**

- `onComplete` prop signature changes from `() => void` to `(skipKitchen: boolean) => void`. The App.tsx handler must branch on this boolean.
- Existing screens this flow can route to: `"home"` (skip kitchen) and `"kitchen"` (set up first). Both are already defined in the `Screen` union in `state.ts` and present in `SCREENS` in `validators.ts`.

**New files introduced:**

- `apps/web/src/components/onboarding/GanttDemoGraphic.tsx`
- `apps/web/src/assets/onboarding/cook-light.png`
- `apps/web/src/assets/onboarding/cook-dark.png`
- `apps/web/src/screens/onboarding.css` (or merged into existing screen CSS)

**Existing files modified:**

- `apps/web/src/screens/OnboardingScreen.tsx` — full rewrite of slide content and gesture logic; prop signature change.
- `apps/web/src/App.tsx` — update `onComplete` handler to branch on `skipKitchen`.

**No engine or API dependencies.** Onboarding is entirely static; it makes no network calls and reads no recipe data.
