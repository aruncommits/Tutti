# 41 — Design System V2

## Overview

The Tutti Design System V2 is the single source of truth for all visual tokens, reusable components, and spacing conventions used across the PWA. It exists to ensure that every screen feels like one coherent product rather than a patchwork of one-off styles, and to make future screen additions fast and predictable. The system is intentionally minimal — it covers exactly what the app uses today, with room to extend without a rewrite.

## Current State

- **File:** `packages/web/src/theme.css` — defines CSS custom properties for light and dark themes
- **Theme switching:** `App.tsx` sets `data-theme` on `<html>` via a `useEffect`; `index.html` has an inline no-flash script that reads `localStorage` before first paint
- **Color variables:** `--bg`, `--bg-tint`, `--surface`, `--text`, `--muted`, `--accent`, `--card-edge` are defined for both `:root` (light) and `:root[data-theme="dark"]`
- **Typography classes:** `zone-h`, `meal-sec`, `value`, `hint` exist in global CSS; inconsistently applied across screens
- **Buttons:** `.btn` (primary), `.btn.ghost` (secondary), `.link` (tertiary anchor style) defined in global CSS
- **Interactive widgets:** `.chip-toggle`, `.kp-toggle`, `.seg` + `.seg-btn` defined; used on Home and Browse screens
- **Ingredient row:** `.ing-row` used in recipe editor and recipe detail
- **Editor row:** `.editor-row` used in addRecipe for reorderable step lists
- **Screen container:** `.zone` wraps each screen's scrollable content area; `.zone-h` is the h1 inside it
- **Spacing:** 16px horizontal padding applied via `.zone { padding: 0 16px; }`; 8px gap between cards; 4px gap between inline items — but these are not defined as named tokens, they are hardcoded in component CSS

**What works:** The core token set is coherent and dark mode is reliable. Buttons and chip-toggles render consistently.

**What is missing or broken:**
- No named spacing tokens (e.g. `--space-xs`, `--space-sm`, `--space-md`) — gap values are scattered as magic numbers
- No `shadow-sm` token — individual screens define their own `box-shadow` values inconsistently
- `meal-sec` typography class is not applied consistently; some screens use raw `<h3>` with inline styles
- No documented component inventory — contributors guess at class names
- No focus-visible / keyboard navigation styles for accessibility

## Problem

A developer adding a new screen has no canonical reference. They see `.btn` in one file, a copy of `.chip-toggle` styles in another, and `font-size: 0.875rem` hardcoded in a third. The result is visual drift: subtle differences in border radius, shadow intensity, and muted-text contrast that make the app feel assembled rather than designed. Dark mode is the biggest pain point — any new component that does not explicitly use CSS variables ends up with hardcoded colors that break in dark mode.

## V2 Design

V2 formalizes the design system as an explicit contract:

1. **Named spacing tokens** are added to `theme.css` so gaps are never magic numbers
2. **Shadow token** `--shadow-sm` is added for cards; `--shadow-md` for modals and bottom sheets
3. **Typography is codified** as a reference table so every text role maps to exactly one class
4. **Accessibility:** `focus-visible` ring is defined globally using `--accent` so keyboard navigation works on all interactive elements without per-component work
5. **Component classes** are listed in a single doc (this one) as the canonical inventory — no duplication allowed

The system does not introduce a CSS-in-JS library or a component framework. All tokens remain plain CSS custom properties. All components remain plain HTML elements with BEM-style class names. The constraint keeps bundle size zero and SSR/PWA compatibility trivial.

## Spec

### Color Tokens (`theme.css`, `:root` block)

| Token | Light value | Dark value | Role |
|---|---|---|---|
| `--bg` | `#ffffff` | `#0f0f0f` | Page/screen background |
| `--bg-tint` | `#f5f5f5` | `#1a1a1a` | Subtle background tint (alternating rows, inset areas) |
| `--surface` | `#ffffff` | `#242424` | Card and modal surfaces |
| `--text` | `#111111` | `#f0f0f0` | Primary readable text |
| `--muted` | `#777777` | `#888888` | Secondary/hint text, inactive labels |
| `--accent` | `#e05c2a` | `#f07040` | Brand color — CTAs, active indicators, progress |
| `--accent-subtle` | `#fdf0ea` | `#2a1a12` | Accent background tint (selected chip fill) |
| `--card-edge` | `#e8e8e8` | `#333333` | Card borders, dividers |
| `--danger` | `#d93025` | `#ff6b5b` | Destructive actions, error states |

### Shadow Tokens

```css
--shadow-sm: 0 1px 4px rgba(0,0,0,0.06);
--shadow-md: 0 4px 24px rgba(0,0,0,0.12);
```

Dark mode overrides:
```css
--shadow-sm: 0 1px 4px rgba(0,0,0,0.30);
--shadow-md: 0 4px 24px rgba(0,0,0,0.50);
```

### Spacing Tokens

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 40px;
```

### Typography

| Class | Size | Weight | Color | Use |
|---|---|---|---|---|
| `zone-h` | 1.4rem | 600 | `--text` | Screen h1 heading |
| `meal-sec` | 0.875rem | 600 | `--muted` | Section sub-header (ALL CAPS, letter-spacing 0.08em) |
| `.value` | 0.9rem | 400 | `--text` | Data values, list items |
| `.hint` | 0.8rem | 400 | `--muted` | Helper text, captions, timestamps |
| `.label` | 0.75rem | 500 | `--muted` | Chip labels, tab labels |

Body text is `system-ui, -apple-system, sans-serif` at `1rem / 1.5` line-height. No web fonts are loaded — this keeps the app fast and offline-safe.

### Buttons

```
.btn              — primary: bg=--accent, text=white, radius=8px, height=44px, padding=0 20px
.btn.ghost        — secondary: bg=transparent, border=1px solid --card-edge, text=--text
.btn.big-btn      — full-width CTA variant: height=52px, font-size=1rem, width=100%
.link             — tertiary: no border/bg, text=--accent, text-decoration=underline on hover
```

All `.btn` variants share: `font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 80ms`.

Disabled state: `opacity: 0.4; pointer-events: none` — applies to all variants.

Focus-visible ring (global):
```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Interactive Components

**.chip-toggle** — filter pill (multi-select)
```
height: 32px; padding: 0 14px; border-radius: 20px;
border: 1px solid var(--card-edge); background: var(--surface);
font-size: 0.8rem; color: var(--muted);
&[aria-pressed="true"] { background: var(--accent-subtle); color: var(--accent); border-color: var(--accent); }
```

**.kp-toggle** — binary kitchen preference toggle (Yes/No, On/Off)
```
Two adjacent buttons sharing a capsule container.
Active half: background var(--accent), color white.
Inactive half: background var(--surface), color var(--muted).
Container: border-radius: 20px; border: 1px solid var(--card-edge); display: inline-flex; overflow: hidden;
```

**.seg / .seg-btn** — segmented control (3-way: Simple / Standard / Elaborate)
```
.seg: display: flex; background: var(--bg-tint); border-radius: 8px; padding: 2px; gap: 2px;
.seg-btn: flex: 1; height: 28px; border-radius: 6px; font-size: 0.78rem; font-weight: 500; color: var(--muted);
.seg-btn[aria-pressed="true"]: background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm);
```

**.ing-row** — ingredient row in recipe detail and editor
```
display: flex; align-items: center; gap: var(--space-sm);
height: 40px; padding: 0 var(--space-md);
border-bottom: 1px solid var(--card-edge);
Left: color swatch dot (10px × 10px, border-radius 50%, color from kindColorOf()).
Middle: ingredient name (flex: 1, .value class).
Right: quantity + unit (.hint class, text-align right).
```

**.editor-row** — reorderable step row in addRecipe and step reorder
```
display: flex; align-items: flex-start; gap: var(--space-sm);
padding: var(--space-sm) var(--space-md); border-bottom: 1px solid var(--card-edge);
Left: drag handle (⠿ glyph, color: --muted, cursor: grab).
Middle: step content (flex: 1).
Right: ↑ ↓ buttons (.btn.ghost, height: 28px, padding: 0 8px).
```

### Screen Container

**.zone** — outermost wrapper for every screen's scrollable content
```css
.zone {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 56px); /* 56px = BottomNav height */
  padding: 0 var(--space-md);
  padding-bottom: calc(var(--space-xl) + 56px); /* clear nav + breathing room */
  overflow-y: auto;
  background: var(--bg);
}
```

**.zone-h** — always the first child `<h1>` inside `.zone`
```css
.zone-h {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text);
  margin: var(--space-md) 0 var(--space-sm);
}
```

### Cards

Generic card pattern (no class name — applied contextually per component):
```css
background: var(--surface);
border: 1px solid var(--card-edge);
border-radius: 12px;
box-shadow: var(--shadow-sm);
overflow: hidden;
```

Cards never have padding on the container itself — interior sections own their own padding so top accent bars and edge-to-edge images can bleed to the card edge.

## Data & Dependencies

- `theme.css` is imported once at the root in `main.tsx`
- `App.tsx` sets `document.documentElement.setAttribute('data-theme', theme)` — all token overrides cascade automatically
- `ingredientColor.tsx` (`kindColorOf`, `KIND_LABEL`) is orthogonal to the design system — it supplies semantic hex colors for ingredient swatches, not for UI chrome
- No external icon library; icons are either emoji characters or inline SVG. V2 does not change this constraint
- Every new screen MUST import no additional CSS beyond its own `<ScreenName>.css` file — shared tokens come from `theme.css` only

---

# 42 — Design Navigation Shell

## Overview

The navigation shell is the persistent frame that wraps every screen in the app. In V2 it is a four-tab bottom navigation bar on mobile and a vertical sidebar on desktop. Its job is to let users move between the four top-level destinations — Cook, Browse, Studio, Me — without losing context, and to disappear entirely on focused screens (cook mode, recipe editor, onboarding) so those screens can use the full viewport.

## Current State

- **File:** `packages/web/src/components/BottomNav.tsx` — renders 5 tab buttons
- **Current tabs:** Home (🏠), Browse (🔍), Studio (📖), Calendar (📅), Settings (⚙️)
- **Active state:** The active tab gets `class="active"` which applies `color: var(--accent)`; no filled/outlined icon distinction because all icons are currently emoji
- **Visibility logic:** Handled in `App.tsx` — a `SCREENS_WITH_NAV` set or inline condition determines whether `<BottomNav>` is rendered
- **No desktop adaptation:** The nav is always bottom-anchored regardless of viewport width
- **Height:** 56px; safe-area padding for iOS notch is applied via `padding-bottom: env(safe-area-inset-bottom)`
- **File:** `packages/web/src/App.tsx` — renders `<BottomNav screen={screen} onTab={setScreen} />` conditionally

**What works:** Tab switching is instantaneous (no route change, just state). The active highlight is visible.

**What is broken or missing:**
- Five tabs is one too many — Calendar and Settings are rarely used and should not occupy persistent real estate
- No visual distinction between filled (active) and outlined (inactive) icon states
- No active indicator dot below the active tab label
- No desktop layout — at ≥768px the bottom nav looks and feels wrong
- No `aria-label` on tab buttons; no `role="tablist"` / `role="tab"` markup

## Problem

Five bottom tabs leave only 20% of the bar width per tab on a 375px phone. The tappable area is borderline acceptable. More importantly, Calendar and Settings together get fewer daily taps than a single recipe card — giving them top-level tab real estate inflates the nav and trains users to ignore the right half of it. There is also no way to reach a "Me" space (profile, settings, meal history) without adding a sixth tab or hiding it in a settings gear icon, which breaks the mental model.

On desktop, a bottom nav bar wastes horizontal space and ignores the natural affordance of a left sidebar that web apps use at wider viewports.

## V2 Design

Collapse 5 tabs to 4: Cook, Browse, Studio, Me.

- **Cook** absorbs Home and Preview — these are the two halves of one flow (pick dishes → see plan)
- **Me** absorbs Calendar, Settings, Meals, and Stats — all user-personal views live inside a single destination

This keeps each tab's tappable width at 25% of the bar (approximately 94px on a 375px screen), which is comfortably above the 44px minimum touch target.

Icon treatment moves from emoji to a pair of SVG paths per tab: one outlined (inactive), one filled (active). This is the standard iOS/Material pattern and eliminates the current ambiguity about which tab is active.

The active indicator dot (3px × 3px, `--accent` fill, centered below the label) provides a secondary active signal that works even when icon fill is subtle in dark mode.

At ≥768px the shell switches to a vertical SideNav. This is a CSS media query change on the shell component — no JS routing changes required.

## Spec

### Tab Definitions

| Index | Label | Icon (inactive / active) | Primary screen | Also activates |
|---|---|---|---|---|
| 0 | Cook | flame-outline / flame-filled | `home` | `preview`, `ready` |
| 1 | Browse | compass-outline / compass-filled | `browse` | `recipe` (when opened from Browse) |
| 2 | Studio | book-outline / book-filled | `studio` | `addRecipe`, `editRecipe`, `menuImport` |
| 3 | Me | person-outline / person-filled | `me` | `calendar`, `meals`, `stats`, `settings`, `pantry`, `shopping` |

### Component: `BottomNav`

```tsx
interface BottomNavProps {
  screen: Screen;
  onTab: (screen: Screen) => void;
}
```

Internal logic:

```
activeTab(screen):
  if screen in [home, preview, ready]       → 0 (Cook)
  if screen in [browse, recipe(fromBrowse)] → 1 (Browse)
  if screen in [studio, addRecipe, editRecipe, menuImport] → 2 (Studio)
  if screen in [me, calendar, meals, stats, settings, pantry, shopping] → 3 (Me)
  else → -1 (no tab highlighted — cook, onboarding, kitchen)
```

The "recipe from Browse" case requires `prevScreen` tracking (already implemented in App.tsx). When `screen === 'recipe'` and `prevScreen === 'browse'`, activeTab returns 1.

### Screens that SHOW the tab bar

`home`, `browse`, `studio`, `me`, `calendar`, `meals`, `pantry`, `shopping`, `settings`, `stats`

### Screens that HIDE the tab bar

`onboarding`, `kitchen`, `addRecipe`, `menuImport`, `recipe`, `editRecipe`, `preview`, `ready`, `cook`

### HTML / Accessibility

```html
<nav class="bottom-nav" role="tablist" aria-label="Main navigation">
  <button class="tab-btn [active]" role="tab" aria-selected="true|false" aria-label="Cook">
    <svg class="tab-icon"><!-- filled or outlined path --></svg>
    <span class="tab-label">Cook</span>
    <span class="tab-dot" aria-hidden="true"></span>
  </button>
  <!-- × 4 -->
</nav>
```

### CSS

```css
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 56px;
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--surface);
  border-top: 1px solid var(--card-edge);
  display: flex;
  z-index: 100;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--muted);
}

.tab-btn.active {
  color: var(--accent);
}

.tab-icon {
  width: 24px;
  height: 24px;
}

.tab-label {
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1;
}

.tab-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: transparent;
}

.tab-btn.active .tab-dot {
  background: var(--accent);
}
```

### Desktop SideNav (`≥768px`)

```css
@media (min-width: 768px) {
  .bottom-nav {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    width: 64px;
    height: 100dvh;
    border-top: none;
    border-right: 1px solid var(--card-edge);
    flex-direction: column;
    justify-content: flex-start;
    padding: var(--space-lg) 0;
    padding-bottom: 0;
    gap: var(--space-xs);
  }

  .tab-btn {
    width: 64px;
    height: 56px;
    flex-direction: column;
  }

  /* Main content area shifts right */
  .app-root {
    margin-left: 64px;
  }
}
```

The `.app-root` wrapper is added to `App.tsx`'s root div. No other layout changes are required — `.zone` already uses `min-height: 100dvh` so it fills the content column correctly.

### Icon SVG Paths

Icons are defined as inline SVG components. Each tab has two path variants. Example for Cook tab:

```tsx
// FlameIcon.tsx
export const FlameIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
    {filled
      ? <path fill="currentColor" d="M12 2C10.5 5 8 7 8 10c0 2.2 1.8 4 4 4s4-1.8 4-4c0-1-.4-2-1-2.8C14.5 8.5 14 10 12 10c-.8 0-1.5-.3-2-.8C10.2 8 10 7 10 6c0-1.2.4-2.4 1-3.3L12 2z M12 14c-3.3 0-6 2.7-6 6h12c0-3.3-2.7-6-6-6z"/>
      : <path d="M12 2C10.5 5 8 7 8 10c0 2.2 1.8 4 4 4s4-1.8 4-4c0-1-.4-2-1-2.8C14.5 8.5 14 10 12 10c-.8 0-1.5-.3-2-.8C10.2 8 10 7 10 6c0-1.2.4-2.4 1-3.3L12 2z M12 14c-3.3 0-6 2.7-6 6h12c0-3.3-2.7-6-6-6z"/>
    }
  </svg>
);
```

All four icons follow the same pattern. SVG paths are self-contained in `packages/web/src/components/icons/`.

## Data & Dependencies

- Reads: `screen: Screen` prop (from App.tsx state), `prevScreen: Screen` prop (for recipe-from-browse detection)
- Writes: calls `onTab(screen: Screen)` which calls `setScreen` in App.tsx
- Must not import any screen-level components — it is a pure navigation primitive
- The `SCREENS_WITH_NAV` constant moves from App.tsx inline logic into `BottomNav.tsx` as a module-level `Set<Screen>`
- Safe-area inset: requires `<meta name="viewport" content="viewport-fit=cover">` in `index.html` — verify this is present

---

# 43 — Design Onboarding Screens

## Overview

Onboarding is the first thing a new user sees. Its job is to answer one question — "what does this do?" — in under 20 seconds, and then get out of the way. The current onboarding explains the concept abstractly; V2 onboarding shows the actual app in use, so users arrive at the home screen already knowing what to tap.

## Current State

- **File:** `packages/web/src/screens/Onboarding.tsx`
- **Current structure:** A stepped screen with text slides and a "Get started" CTA that leads to kitchen setup
- **Kitchen setup:** Currently mandatory — users cannot skip it
- **Slide content:** Concept-focused ("What is Tutti?", "How it works") rather than product-screenshot-focused
- **Navigation:** After final slide, navigates to `kitchen` screen always
- **State stored:** `localStorage` key `tutti.onboarded = true` prevents re-showing on reload

**What works:** The skip-to-end logic exists in some form; the slide dot indicator renders correctly.

**What is broken or missing:**
- No way to bypass kitchen setup (Phase 5 spec said "isPlan validator pending" — kitchen is still a gate)
- Slide 2 does not show the cook screen; it shows a text description
- No "Set up my kitchen" vs "Start cooking" split CTA on the final slide
- Skip link in top-right is absent
- Dots indicator exists but active dot uses CSS class `active` which clashes with BottomNav's `.active`

## Problem

The current onboarding front-loads configuration (kitchen setup) before the user has seen any value. A user who just installed a cooking app is not ready to inventory their kitchen — they want to cook something tonight. Forcing kitchen setup as a pre-condition means the app can answer zero questions before asking two of its own. The result: abandonment before the home screen.

The text-only slides also fail to communicate the core differentiator. "Tutti calculates a parallel timeline" is abstract. A screenshot of the Gantt timeline makes the same point in one glance.

## V2 Design

Three slides. Each slide has one concrete, visual job:

1. Show what the output looks like (the Gantt timeline) — establish the promise
2. Show what cooking with it feels like (the cook screen) — make it tangible
3. Remove the last barrier (no mandatory kitchen setup) — get the user to the home screen

Skip link is always available from slide 1 and 2, going directly to home screen. The final slide does not need a skip link because both its CTAs lead forward.

Kitchen setup becomes an optional flow accessible from the Me tab after the user is in the app.

## Spec

### Component: `Onboarding.tsx`

```tsx
interface OnboardingProps {
  onDone: (skipKitchen: boolean) => void;
}

// onDone(true)  → navigate to 'home'
// onDone(false) → navigate to 'kitchen'
```

Internal state:
```tsx
const [slide, setSlide] = useState(0); // 0 | 1 | 2
```

On mount: if `localStorage.getItem('tutti.onboarded')` is `'true'`, call `onDone(true)` immediately (already-onboarded users are not shown onboarding on reload).

On completion: set `localStorage.setItem('tutti.onboarded', 'true')` then call `onDone`.

### Layout Shell

```html
<div class="onboarding">
  <button class="onboarding-skip link" aria-label="Skip introduction">Skip</button>
  <div class="onboarding-slides">
    <!-- slide content, translated by CSS transform -->
  </div>
  <div class="onboarding-dots" role="tablist" aria-label="Slide indicator">
    <span class="dot [active]" role="tab" aria-selected="true|false"></span>
    <span class="dot"></span>
    <span class="dot"></span>
  </div>
</div>
```

```css
.onboarding {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
  position: relative;
}

.onboarding-skip {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  z-index: 10;
  font-size: 0.875rem;
  color: var(--muted);
}

.onboarding-slides {
  flex: 1;
  display: flex;
  transition: transform 300ms ease;
  /* width: 300%; each slide is 33.33% */
}

.onboarding-dots {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  padding: var(--space-lg) 0 var(--space-xl);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--card-edge);
  transition: background 200ms;
}

.dot.active {
  background: var(--accent);
  width: 18px; /* elongated pill when active */
  border-radius: 3px;
}
```

### Slide 1 — "Cook smarter tonight"

**Purpose:** Show the Gantt timeline. Establish what makes Tutti different.

**Layout (top to bottom):**
1. Illustration area (flex: 1, max-height: 55dvh) — a full-width inline SVG showing a simplified Gantt chart. Three horizontal bars of different colors at staggered start points, all ending at the same right edge. A vertical dashed line at the right edge labeled "Serve time." Background is `--bg-tint`. The bars use ingredient kind colors (`#e87c4a`, `#5b8a4e`, `#4a7bbf`) to look like the actual app.
2. Content area (padding: 0 var(--space-md)):
   - `<h1 class="zone-h">Everything done at the same time.</h1>`
   - `<p class="hint" style="margin-bottom: var(--space-lg);">Tutti calculates who does what and when.</p>`
   - `<button class="btn big-btn" onclick="setSlide(1)">See how →</button>`

The illustration is an SVG asset at `packages/web/src/assets/onboarding-gantt.svg`. It uses hardcoded colors (not CSS vars) so it renders identically in light and dark mode — it is a product screenshot illustration, not UI chrome.

### Slide 2 — "Step by step, while you cook"

**Purpose:** Show the cook screen in action. Make the hands-free angle tangible.

**Layout:**
1. Screenshot mockup area (flex: 1, max-height: 55dvh) — a device-frame SVG/PNG containing a cropped render of the Cook screen: the NOW panel showing one step with a countdown timer, the NEXT panel showing the upcoming step name, and the PASSIVE panel label. Device frame is a simple rounded rect with a notch (no brand marks). Background of the frame matches `--bg`.
2. Content area:
   - `<h1 class="zone-h">Follow along, hands-free.</h1>`
   - `<p class="hint" style="margin-bottom: var(--space-lg);">Your phone knows what's on your stove — you focus on the food.</p>`
   - `<button class="btn big-btn" onclick="setSlide(2)">Almost there →</button>`

The mockup is a static asset (`onboarding-cook-screen.png`, 2× resolution for retina). It is NOT a live rendered component — rendering the full Cook screen inside a small frame is expensive and fragile.

### Slide 3 — "Start right now"

**Purpose:** Remove the last barrier. Offer both paths (kitchen setup vs. skip) without making the skip feel wrong.

**Layout:**
1. Icon area (160px × 160px, centered, margin-top: var(--space-xl)): a chef hat SVG in `--accent` color. No background fill — icon only, sized to feel significant without being overwhelming.
2. Content area:
   - `<h1 class="zone-h" style="text-align:center">No setup needed.</h1>`
   - `<p class="hint" style="text-align:center; margin-bottom: var(--space-xl);">Start cooking tonight. You can tell Tutti about your kitchen whenever you're ready.</p>`
   - `<button class="btn big-btn" onclick="onDone(true)">Start cooking</button>`
   - `<button class="btn ghost big-btn" style="margin-top: var(--space-sm)" onclick="onDone(false)">Set up my kitchen</button>`
3. No skip link on slide 3 — both buttons lead forward.

**Note:** "Set up my kitchen" is the ghost/secondary button, making "Start cooking" the clear primary default. This is intentional — most users should skip kitchen setup on first run.

### Swipe Gesture

The slide container supports touch swipe right-to-advance on slides 1 and 2:

```tsx
const handleTouchStart = (e: React.TouchEvent) => {
  touchStartX.current = e.touches[0].clientX;
};
const handleTouchEnd = (e: React.TouchEvent) => {
  const delta = touchStartX.current - e.changedTouches[0].clientX;
  if (delta > 50 && slide < 2) setSlide(s => s + 1);
  if (delta < -50 && slide > 0) setSlide(s => s - 1);
};
```

Swipe left (back) is supported on slides 2 and 3.

### Accessibility

- `role="tablist"` on the dots container, `role="tab"` and `aria-selected` on each dot
- Slide container has `aria-live="polite"` so screen readers announce slide changes
- Skip button is always the first focusable element in DOM order
- CTA buttons are never disabled — if the user taps "Start cooking" before animations finish, the navigation fires immediately

## Data & Dependencies

- Writes to `localStorage`: `tutti.onboarded = 'true'`
- Reads from `localStorage` on mount to short-circuit
- Calls `onDone(skipKitchen: boolean)` — App.tsx handles routing: `skipKitchen ? setScreen('home') : setScreen('kitchen')`
- No API calls, no engine calls
- Static assets: `onboarding-gantt.svg`, `onboarding-cook-screen.png` in `packages/web/src/assets/`
- Chef hat SVG: can be an inline component `ChefHatIcon.tsx` in `packages/web/src/components/icons/`

---

# 44 — Design Home Screen V2

## Overview

The Home screen is the Cook tab's primary view. Its job is to let a user quickly assemble a set of dishes, set a serve time, and launch into a cooking plan. It is simultaneously a blank canvas for new cooks (empty state) and a control panel for experienced ones (dish list with servings, tier, and a nutrition summary). Every element on the screen is either an input to the plan or a shortcut to adding more inputs.

## Current State

- **File:** `packages/web/src/screens/Home.tsx`
- **Current features:** Dish list (DishCard components), serve-time picker, Build Plan button, bottom sheet library picker
- **Navigation:** Links to Browse (via a button) and triggers `compile()` then navigates to `preview`
- **Library picker:** A full-screen modal or overlay — not a bottom sheet from the bottom
- **Nutrition strip:** `NutritionStrip` component exists, shown below the dish list
- **Suggestions:** Not present — no recommendation surface
- **Serve-time chip:** Serve time is set via a separate time picker input, not a visible chip on the main screen
- **Empty state:** Shows a text prompt and a "Browse recipes" button, but no action chips and no suggestions row

**What works:** DishCard, servings spinner, × remove, Build Plan with compile integration, the library bottom sheet slide-up animation.

**What is broken or missing:**
- Serve time is not permanently visible — users lose track of what time they set
- Empty state is plain and does not surface quick-add paths (Paste, Ask AI, Import menu)
- No suggestions row — users with zero history have no starting point
- The library picker bottom sheet does not have a drag handle or ✕ close button in current implementation

## Problem

A returning user opens the Home screen and sees their last session's dishes (or an empty screen). Neither state tells them "here's what to do next." The serve-time is hidden until they actively look for it, which means users who build a plan and then change their mind about dinner time have to hunt for the control. The empty state offers only one path (Browse) when many users already know what they want to cook and just want to paste a recipe name or ask AI.

## V2 Design

The screen has four vertical zones, from top to bottom:

1. **Header** — screen title + serve-time chip always visible
2. **Content** — either empty-state or dish list, depending on `dishes.length`
3. **Nutrition** — always shown when `dishes.length > 0`
4. **Build Plan** — sticky CTA at the bottom when `dishes.length > 0`

The serve-time chip is always in the header, always tappable, styled as an accent-bordered pill rather than a form input. This makes "what time are we eating?" a one-tap affordance instead of a buried input.

The empty state becomes a mini-discovery surface: Browse button for deliberate browsing, plus three quick-add chips for power users, plus a Suggestions row so first-time users see real recipes immediately.

The library picker bottom sheet gets a proper drag handle and ✕ so the interaction is clear on both touch and mouse.

## Spec

### Component: `Home.tsx`

```tsx
interface HomeProps {
  dishes: DishSelection[];
  onAddDish: (recipe: RecipeGraph) => void;
  onRemoveDish: (recipeId: string) => void;
  onChangeTier: (recipeId: string, tier: Tier) => void;
  onChangeServings: (recipeId: string, servings: number) => void;
  serveTime: Date;
  onServeTimeChange: (t: Date) => void;
  onBuildPlan: () => void;
  kitchen: KitchenProfile;
}
```

### Header Zone

```html
<div class="home-header">
  <h1 class="zone-h">Tonight's cook</h1>
  <button class="serve-time-chip" aria-label="Change serve time">
    Ready at 7:00 PM · ✎
  </button>
</div>
```

```css
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) 0 var(--space-sm);
}

.serve-time-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 500;
  background: var(--accent-subtle);
  cursor: pointer;
  white-space: nowrap;
}
```

Tapping the chip opens a native `<input type="time">` inside a small popover anchored below the chip. On iOS Safari, the native time picker slides up from the bottom — this is acceptable and requires no custom implementation. The input is visually hidden (`position: absolute; opacity: 0; pointer-events: none`) and `.focus()` is called programmatically on chip tap.

The chip always shows the current serve time formatted as `"Ready at H:MM AM/PM · ✎"` using `Intl.DateTimeFormat`.

If the serve time is in the past (user forgot to update it), the chip text becomes `"Ready at 7:00 PM · ✎"` with `color: var(--danger)` border and text — no modal, just a color signal.

### Empty State Zone

Shown when `dishes.length === 0`.

```html
<div class="home-empty">
  <button class="btn big-btn home-browse-btn">Browse recipes</button>

  <div class="home-quick-actions">
    <button class="chip-toggle">Paste</button>
    <button class="chip-toggle">Ask AI</button>
    <button class="chip-toggle">Import menu</button>
  </div>

  <div class="home-suggestions">
    <h2 class="meal-sec">Suggestions</h2>
    <div class="home-suggestions-scroll">
      <!-- 3 SuggestionCard components -->
    </div>
  </div>
</div>
```

```css
.home-empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding-top: var(--space-md);
}

.home-browse-btn {
  /* inherits .btn.big-btn */
}

.home-quick-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
}

.home-suggestions-scroll {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  padding-bottom: var(--space-sm);
  /* hide scrollbar on Webkit */
  scrollbar-width: none;
}
.home-suggestions-scroll::-webkit-scrollbar { display: none; }
```

**Quick action chips behavior:**
- "Paste": opens a small popover with a textarea — user pastes recipe URL or name, app attempts to parse/match it
- "Ask AI": opens the AI generation flow (future spec; for V2 the chip is visible but shows a "Coming soon" toast on tap)
- "Import menu": navigates to `menuImport` screen

**Suggestions row:** Shows 3 `SuggestionCard` components. Data source is `packages/web/src/data/suggestions.ts` — a static list of 12 popular recipe IDs from the server catalog, randomly sampled to 3 on mount. No API call needed on the happy path. If the catalog is not yet loaded, the suggestions row is hidden.

**SuggestionCard:**
```html
<button class="suggestion-card">
  <div class="suggestion-accent-bar" style="background: [kindColor]"></div>
  <div class="suggestion-name">Chicken Tikka Masala</div>
  <div class="suggestion-meta hint">~45 min · Standard</div>
</button>
```
```css
.suggestion-card {
  min-width: 140px;
  background: var(--surface);
  border: 1px solid var(--card-edge);
  border-radius: 12px;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}
.suggestion-accent-bar { height: 6px; }
.suggestion-name {
  padding: var(--space-sm) var(--space-sm) 2px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}
.suggestion-meta {
  padding: 0 var(--space-sm) var(--space-sm);
}
```
Tapping a SuggestionCard calls `onAddDish(recipe)` — same as picking from the library picker.

### Dish List Zone

Shown when `dishes.length > 0`.

```html
<ul class="dish-list" aria-label="Tonight's dishes">
  <li class="dish-card" v-for="dish in dishes">
    <!-- DishCard component -->
  </li>
</ul>
```

**DishCard component** (`packages/web/src/components/DishCard.tsx`):

```html
<div class="dish-card">
  <div class="dish-accent" style="background: [kindColorOf(dish.name)]"></div>
  <div class="dish-body">
    <div class="dish-row-top">
      <span class="dish-name value">Chicken Tikka Masala</span>
      <button class="dish-remove link" aria-label="Remove Chicken Tikka Masala">✕</button>
    </div>
    <div class="dish-row-bottom">
      <div class="seg dish-tier">
        <button class="seg-btn [active]" aria-pressed="true">Simple</button>
        <button class="seg-btn" aria-pressed="false">Standard</button>
        <button class="seg-btn" aria-pressed="false">Elaborate</button>
      </div>
      <div class="dish-servings">
        <button class="servings-btn" aria-label="Decrease servings">−</button>
        <span class="servings-val value">4</span>
        <button class="servings-btn" aria-label="Increase servings">+</button>
      </div>
    </div>
  </div>
</div>
```

```css
.dish-card {
  display: flex;
  background: var(--surface);
  border: 1px solid var(--card-edge);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: var(--space-sm);
  box-shadow: var(--shadow-sm);
}

.dish-accent {
  width: 6px;
  flex-shrink: 0;
}

.dish-body {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.dish-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dish-name { font-weight: 600; }

.dish-remove {
  color: var(--muted);
  font-size: 0.85rem;
  padding: 4px;
}

.dish-row-bottom {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.dish-tier { flex: 1; }

.dish-servings {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.servings-btn {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1px solid var(--card-edge);
  background: var(--bg-tint);
  font-size: 1rem;
  color: var(--text);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}

.servings-val {
  min-width: 20px;
  text-align: center;
}
```

Tier segmented control: only shows tiers available for the recipe. If a recipe only has Simple and Standard, the Elaborate button is hidden (not disabled — absent).

Servings: minimum 1, maximum 12. At minimum, the − button is `opacity: 0.3; pointer-events: none`.

### Nutrition Strip

Component: `NutritionStrip` (already exists, spec unchanged).

Shown when `dishes.length > 0`. Positioned immediately below the last DishCard.

```html
<div class="nutrition-strip">
  <span class="nut-item"><b>P</b> 32g</span>
  <span class="nut-divider">·</span>
  <span class="nut-item"><b>C</b> 48g</span>
  <span class="nut-divider">·</span>
  <span class="nut-item"><b>F</b> 18g</span>
  <span class="nut-divider">·</span>
  <span class="nut-item">540 Cal</span>
</div>
```

```css
.nutrition-strip {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) 0;
  font-size: 0.8rem;
  color: var(--muted);
}
.nut-item b { color: var(--text); }
.nut-divider { color: var(--card-edge); }
```

Values are "per serving" and labeled as such with a `.hint` span: `"per serving"` right-aligned in the strip.

### Build Plan Button

```html
<div class="build-plan-bar">
  <button class="btn big-btn build-plan-btn" disabled={isCompiling}>
    {isCompiling ? 'Building…' : `Build Plan (~${estimatedMinutes} min)`}
  </button>
</div>
```

```css
.build-plan-bar {
  position: sticky;
  bottom: calc(56px + env(safe-area-inset-bottom) + var(--space-md));
  padding: var(--space-sm) 0;
  background: linear-gradient(transparent, var(--bg) 40%);
  pointer-events: none; /* let gradient pass through */
}

.build-plan-btn {
  pointer-events: all;
}
```

The estimated time is a fast pre-compute: sum of all dishes' `estimatedMinutes` field from the recipe metadata, not a full `compile()` call. This is displayed before Build Plan is pressed. The actual compile runs on press.

If `compile()` throws (e.g. no nodes in a recipe), a toast is shown: `"Couldn't build a plan — try removing [recipeName]."` The error does not navigate away.

### Library Picker Bottom Sheet

```html
<div class="sheet-overlay" aria-hidden={!pickerOpen} onClick={closePicker}>
  <div class="sheet" role="dialog" aria-label="Add a recipe">
    <div class="sheet-handle-bar">
      <div class="sheet-handle"></div>
    </div>
    <button class="sheet-close btn ghost" aria-label="Close">✕</button>
    <LibraryBrowser mode="picker" onPick={onAddDish} />
  </div>
</div>
```

```css
.sheet-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  height: 80dvh;
  background: var(--surface);
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  transform: translateY(100%);
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet[data-open="true"] {
  transform: translateY(0);
}

.sheet-handle-bar {
  padding: var(--space-sm) 0 0;
  display: flex;
  justify-content: center;
}

.sheet-handle {
  width: 36px; height: 4px;
  border-radius: 2px;
  background: var(--card-edge);
}

.sheet-close {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  width: 32px; height: 32px;
  padding: 0;
  border-radius: 50%;
  font-size: 0.9rem;
}
```

Drag-to-dismiss: track `touchstart`/`touchmove` on `.sheet`. If the user drags down more than 80px and releases, close the sheet. If they drag down and release with velocity > 300px/s, close regardless of distance.

`LibraryBrowser` in "picker" mode: renders the same search + category filter UI as the Studio screen but with a single "+ Add" button per result instead of a full detail view. When a recipe is picked, the sheet closes and the DishCard appears immediately in the list.

## Data & Dependencies

- `dishes: DishSelection[]` — comes from App.tsx state, persisted to `localStorage tutti.dishes`
- `serveTime: Date` — App.tsx state, persisted to `localStorage tutti.serveTime`
- `kindColorOf(name)` from `ingredientColor.tsx` — used for DishCard accent and SuggestionCard accent
- `compile()` from `@tutti/engine` — called on Build Plan press, result passed to Preview screen
- `NutritionStrip` — existing component, reads `dishes` and sums macro data from recipe nodes
- `LibraryBrowser` — existing component, extended with `mode: 'picker' | 'full'` prop
- On Build Plan press: `onBuildPlan()` → App.tsx calls `compile()` → navigates to `preview` with the resulting `MasterExecutionPlan`

---

# 45 — Design Browse Discovery Screen

## Overview

The Browse screen is the server catalog discovery surface. Users come here with a specific dish in mind ("what's a good dal recipe?") or browsing openly ("what Indian dishes does Tutti have?"). The screen must support both modes: keyword search for intent-driven users and category + filter chips for exploratory users. Every dish card ends with a direct path to adding the dish to tonight's plan without leaving Browse.

## Current State

- **File:** `packages/web/src/screens/Browse.tsx`
- **Current features:** Category chips (horizontal scroll), search input, recipe cards in a flat list, a preview modal
- **Card layout:** Single-column list — one card takes full screen width
- **Filter system:** Category chips only — no time, diet, or tier filters
- **Preview modal:** Opens on card tap; is full-screen on mobile — covers the Browse screen entirely
- **Add to plan:** Button inside the preview modal — requires two taps to add a dish from Browse
- **Card content:** Name, cuisine, estimated time — no tier, no dietary tags, no color accent bar

**What works:** Category chip selection filters the list reactively. Search is debounced. The preview modal displays the full recipe with ingredients and steps.

**What is broken or missing:**
- Single-column list means only 2-3 cards visible above fold on a phone — poor density for a discovery screen
- No filter sheet (tier, diet, time) — users cannot narrow to "vegetarian under 30 minutes"
- No "+ Add to tonight's plan" action on the card itself — forces a preview modal detour for every add
- Active filter count badge on the Filters button does not exist
- Dismissible active filter chips below the category row do not exist

## Problem

A user who wants to find "quick vegetarian dishes" has to scroll through the full catalog because there is no time or diet filter. A user who already knows they want to add "Palak Paneer" to their plan has to tap the card, wait for the modal, then tap Add — three taps for what should be one. The single-column list compounds both problems: fewer items visible means more scrolling to compare options.

## V2 Design

Two changes address these problems directly:

1. **2-column grid** replaces the single-column list on mobile. At 375px screen width, two cards at ~163px each fit with 16px outer padding and 8px gap. This doubles information density without making cards feel cramped.

2. **Dual action row on each card** — "+ Add to tonight's plan" (primary) and "View" (ghost) — collapses the common path from 3 taps to 1. "View" still opens the full recipe for users who want details before committing.

3. **Filter bottom sheet** adds diet, time, and tier dimensions. Active filters are shown as dismissible chips below the category row so users see what is currently narrowing results.

The preview modal (opening from "View" button) remains a bottom-sheet-style overlay at 90% screen height rather than a full-screen takeover, so Browse context is not lost.

## Spec

### Component: `Browse.tsx`

```tsx
interface BrowseProps {
  onAddToplan: (recipe: RecipeGraph) => void;
  onViewRecipe: (recipeId: string) => void;
  dishes: DishSelection[]; // to show "Added ✓" state on cards already in plan
}
```

Internal state:
```tsx
const [category, setCategory] = useState<string>('all');
const [query, setQuery] = useState('');
const [filters, setFilters] = useState<BrowseFilters>({ diet: [], time: 'any', tier: [] });
const [filterSheetOpen, setFilterSheetOpen] = useState(false);
```

```tsx
interface BrowseFilters {
  diet: DietTag[];        // e.g. ['vegetarian', 'gluten-free']
  time: 'any' | 'under30' | 'under60';
  tier: Tier[];           // ['simple', 'moderate', 'complex']
}
```

### Search Bar

```html
<div class="browse-search">
  <input
    class="search-input"
    type="search"
    placeholder="Search dishes…"
    aria-label="Search recipes"
  />
</div>
```

```css
.browse-search {
  padding: var(--space-sm) 0;
}

.search-input {
  width: 100%;
  height: 40px;
  border-radius: 20px;
  border: 1px solid var(--card-edge);
  background: var(--bg-tint);
  padding: 0 var(--space-md);
  font-size: 0.9rem;
  color: var(--text);
  outline: none;
}

.search-input:focus {
  border-color: var(--accent);
  background: var(--surface);
}
```

Debounced 250ms. Clears category filter when a search query is active (intent-driven search overrides browse-by-category).

### Category Chip Row

```html
<div class="category-chips" role="radiogroup" aria-label="Filter by category">
  <button class="chip-toggle [active]" aria-pressed="true">All</button>
  <button class="chip-toggle" aria-pressed="false">
    South Indian
    <span class="chip-count">24</span>
  </button>
  <!-- … -->
</div>
```

```css
.category-chips {
  display: flex;
  gap: var(--space-xs);
  overflow-x: auto;
  padding: 0 0 var(--space-sm);
  scrollbar-width: none;
}
.category-chips::-webkit-scrollbar { display: none; }

.chip-count {
  display: inline-block;
  background: var(--card-edge);
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 10px;
  padding: 1px 6px;
  margin-left: 4px;
}

.chip-toggle[aria-pressed="true"] .chip-count {
  background: var(--accent);
  color: white;
}
```

"All" chip is always first. Category list is derived from the catalog data — `categories` field on the server response. Count is the number of dishes in that category after other filters are applied.

### Filter Bar

```html
<div class="browse-filter-bar">
  <button class="btn ghost filter-btn" onClick={openFilterSheet}>
    Filters
    {activeFilterCount > 0 && (
      <span class="filter-count-badge">{activeFilterCount}</span>
    )}
  </button>
  <div class="active-filter-chips">
    {/* dismissible chips for each active filter */}
    <button class="chip-toggle active dismissible">
      Vegetarian ✕
    </button>
  </div>
</div>
```

```css
.browse-filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  flex-shrink: 0;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-count-badge {
  background: var(--accent);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 10px;
  padding: 1px 6px;
  line-height: 1.4;
}

.dismissible {
  padding-right: 8px; /* tighter for ✕ */
}
```

`activeFilterCount` = `filters.diet.length + (filters.time !== 'any' ? 1 : 0) + filters.tier.length`.

Tapping a dismissible chip removes that single filter. Tapping "Filters" opens the filter bottom sheet.

### Dish Card Grid

```html
<div class="browse-grid">
  <div class="dish-card-browse" v-for="dish in filteredDishes">
    <!-- BrowseDishCard component -->
  </div>
</div>
```

```css
.browse-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
  padding-bottom: calc(56px + var(--space-xl));
}

@media (min-width: 600px) {
  .browse-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### BrowseDishCard Component

```html
<div class="dish-card-browse [added]">
  <div class="card-accent-bar" style="background: [kindColor]"></div>
  <div class="card-body">
    <div class="card-name">Palak Paneer</div>
    <div class="card-tags">
      <span class="card-tag">North Indian</span>
      <span class="card-tag dietary">Vegetarian</span>
    </div>
    <div class="card-meta hint">~35 min · Standard</div>
  </div>
  <div class="card-actions">
    <button class="btn big-btn card-add-btn" disabled={alreadyAdded}>
      {alreadyAdded ? 'Added ✓' : '+ Add to plan'}
    </button>
    <button class="btn ghost card-view-btn">View</button>
  </div>
</div>
```

```css
.dish-card-browse {
  background: var(--surface);
  border: 1px solid var(--card-edge);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}

.card-accent-bar {
  height: 6px;
  flex-shrink: 0;
}

.card-body {
  padding: var(--space-sm);
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text);
  line-height: 1.3;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.card-tag {
  font-size: 0.72rem;
  background: var(--bg-tint);
  color: var(--muted);
  border-radius: 4px;
  padding: 1px 6px;
}

.card-tag.dietary {
  background: var(--accent-subtle);
  color: var(--accent);
}

.card-meta {
  margin-top: auto;
}

.card-actions {
  padding: var(--space-xs) var(--space-sm) var(--space-sm);
  display: flex;
  gap: var(--space-xs);
}

.card-add-btn {
  flex: 1;
  height: 36px;
  font-size: 0.8rem;
  border-radius: 8px;
}

.card-view-btn {
  height: 36px;
  padding: 0 12px;
  font-size: 0.8rem;
  border-radius: 8px;
  flex-shrink: 0;
}

.dish-card-browse.added .card-add-btn {
  background: var(--bg-tint);
  color: var(--muted);
  border-color: var(--card-edge);
}
```

"Added ✓" state: when `dishes.some(d => d.recipeId === recipe.id)` is true, the Add button becomes "Added ✓" and is disabled. It does not disable the card or the View button.

### Filter Bottom Sheet

```html
<div class="sheet-overlay" aria-hidden={!filterSheetOpen}>
  <div class="sheet filter-sheet" role="dialog" aria-label="Filter recipes">
    <div class="sheet-handle-bar"><div class="sheet-handle"></div></div>
    <div class="sheet-title zone-h">Filters</div>

    <div class="sheet-scroll">

      <section class="filter-section">
        <h3 class="meal-sec">Diet</h3>
        <div class="filter-chips">
          <button class="chip-toggle [active]" aria-pressed="...">Vegetarian</button>
          <button class="chip-toggle" aria-pressed="...">Vegan</button>
          <button class="chip-toggle" aria-pressed="...">Gluten-free</button>
          <button class="chip-toggle" aria-pressed="...">Dairy-free</button>
          <button class="chip-toggle" aria-pressed="...">High-protein</button>
        </div>
      </section>

      <section class="filter-section">
        <h3 class="meal-sec">Time</h3>
        <div class="filter-chips">
          <button class="chip-toggle [active]" role="radio" aria-checked="...">Any</button>
          <button class="chip-toggle" role="radio" aria-checked="...">Under 30 min</button>
          <button class="chip-toggle" role="radio" aria-checked="...">Under 60 min</button>
        </div>
      </section>

      <section class="filter-section">
        <h3 class="meal-sec">Tier</h3>
        <div class="filter-chips">
          <button class="chip-toggle" aria-pressed="...">Simple</button>
          <button class="chip-toggle" aria-pressed="...">Standard</button>
          <button class="chip-toggle" aria-pressed="...">Elaborate</button>
        </div>
      </section>

    </div>

    <div class="sheet-footer">
      <button class="btn big-btn" onClick={applyFilters}>Apply filters</button>
      <button class="link" onClick={clearFilters}>Clear all</button>
    </div>
  </div>
</div>
```

```css
.filter-sheet {
  height: auto;
  max-height: 85dvh;
}

.sheet-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--space-md);
}

.filter-section {
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--card-edge);
}

.filter-section:last-child {
  border-bottom: none;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.sheet-footer {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: center;
  border-top: 1px solid var(--card-edge);
}

.sheet-footer .link {
  font-size: 0.875rem;
}
```

**Diet chips:** multi-select (`aria-pressed`). Multiple can be active simultaneously. A dish must match ALL active diet tags to appear (AND logic, not OR).

**Time chips:** single-select (`role="radio"`, `aria-checked`). Selecting one deselects the others.

**Tier chips:** multi-select. If no tier chips are active, all tiers are shown.

**Apply vs. live filter:** The sheet uses an "Apply" model (not live). Changes inside the sheet do not filter the grid until "Apply filters" is tapped. This avoids re-fetching or re-filtering on every chip tap, which would cause jarring grid reflows. `clearFilters` resets to `{ diet: [], time: 'any', tier: [] }` and closes the sheet.

### Empty Search/Filter State

When `filteredDishes.length === 0`:
```html
<div class="browse-empty">
  <p class="hint">No dishes match your filters.</p>
  <button class="link" onClick={clearFilters}>Clear filters</button>
</div>
```

### Virtual Scrolling

At 600 recipes across all categories, the grid can render up to 200 items at once (200 dishes × 1 tier selected). This is within React's render budget for static list items without virtualization. However, if performance profiling shows scroll jank on low-end devices, the grid should adopt `react-virtual` with a fixed item height of 220px. This is a future optimization, not a V2 requirement.

## Data & Dependencies

- Server catalog fetched via `/api/library/list` (existing endpoint) — returns `{ id, name, cuisine, dietary, tier, estimatedMinutes, categoryId }`
- Category list fetched via `/api/library/categories` — returns `{ id, name, count }`
- `kindColorOf(name)` from `ingredientColor.tsx` — card accent bar color
- `dishes: DishSelection[]` from App.tsx state — for "Added ✓" state
- `onAddToplan(recipe)` writes to App.tsx state → persisted to localStorage
- `onViewRecipe(recipeId)` → App.tsx sets `prevScreen = 'browse'` then `screen = 'recipe'` (existing prevScreen tracking)
- Filter state is local to Browse.tsx — not persisted between sessions (intentional — filters are session-level intent)
- The preview modal opened from "View" reuses the existing `RecipePreviewModal` component (or the `recipe` screen routed with `prevScreen = 'browse'` — implementation choice for the dev, both are valid)
