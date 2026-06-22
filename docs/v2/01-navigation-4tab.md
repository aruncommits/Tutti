# 01 — Navigation: 4-Tab Shell

## Overview

The navigation shell is the persistent chrome that lets users move between the four major areas of Tutti: the cooking loop (Cook), the server catalog (Browse), personal recipe management (Studio), and account/management utilities (Me). Today, this chrome does not exist as a component — tab buttons are rendered inline inside App.tsx against a flat screen state machine. V2 extracts navigation into a dedicated `Shell` + `BottomNav` component tree, collapses five tabs to four, and frees Calendar and Settings from primary nav so the bottom bar reflects only the actions users take every session.

---

## Current State

**Files:**
- `apps/web/src/App.tsx` — contains the screen state machine, all `setScreen` calls, and inline tab button rendering
- `apps/web/src/state.ts` — `Screen` union type; `CurrentScreen` or equivalent state
- `apps/web/src/validators.ts` — `SCREENS` set used for runtime validation

**What exists today:**
- 5 bottom tabs rendered inline in `App.tsx`: Home, Browse, Studio, Calendar, Settings
- Each tab maps 1:1 to a single `Screen` value (`home`, `browse`, `studio`, `calendar`, `settings`)
- `prevScreen` ref exists in `App.tsx` to support Back navigation from `recipe` screen
- `recipeOriginScreen.current` tracks which screen opened a recipe
- The tab bar is visible on all screens including full-screen flows (cook, preview, recipe, editRecipe, etc.) — suppression is not consistently enforced as a first-class concern
- No `Shell` wrapper component; layout is flat inside `App.tsx`'s return

**What is broken or missing:**
- Calendar and Settings occupy primary tab slots despite low session frequency
- No concept of a "tab group" — screens like `preview` and `cook` have no tab affiliation, so the active tab highlight is ambiguous when the user is mid-cook
- No desktop sidebar; the layout is mobile-only in practice
- No badge system on any tab
- Tab suppression logic is implicit and scattered, not driven by a declarative list

---

## Problem

From a real user's perspective:

1. **Wasted primary nav space.** Calendar and Settings are consulted maybe once a week. They sit next to Home and Browse — the two screens opened every session — consuming equal visual weight and making the bar feel cluttered.

2. **The cooking loop has no home.** Home → Preview → Cook is a single continuous flow, but each is a disconnected screen value with no shared tab identity. Tapping "Home" mid-cook looks like it would break the session.

3. **No sense of where you are.** When the user is in the cook screen, no tab is clearly active. The active-highlight logic needs a tab affiliation for every screen.

4. **The bar shows during full-screen moments it shouldn't.** The cook screen and the recipe detail screen are immersive; the tab bar competing for screen space at the bottom is visual noise and wastes vertical real estate on mobile.

5. **No desktop adaptation.** On a 1024px iPad in landscape or a laptop browser, a bottom tab bar is awkward; a left sidebar is the correct pattern, but nothing exists.

---

## V2 Design

**Four tabs replace five:**

| Tab | Label | Icon | Primary screen | Screens in group |
|-----|-------|------|----------------|-----------------|
| 1 | Cook | flame | `home` | `home`, `preview`, `ready`, `cook` |
| 2 | Browse | compass | `browse` | `browse` |
| 3 | Studio | open-book | `studio` | `studio`, `addRecipe`, `editRecipe`, `menuImport` |
| 4 | Me | person | `meals` | `meals`, `calendar`, `pantry`, `shopping`, `stats`, `settings` |

**Why these groupings:**

- Cook is the reason the app exists. Preview and Cook are mid-session states of the same flow, not separate destinations. Grouping them under one flame tab means tapping Cook during a session never feels destructive — it just surfaces the active step in the flow.
- Browse is already self-contained and high-frequency. No change in grouping.
- Studio is the "workshop" — any screen where the user authors or imports recipes. `addRecipe`, `editRecipe`, and `menuImport` are Studio sub-flows, not independent destinations, so they suppress the tab bar but remain affiliated.
- Me consolidates everything calendar/history/pantry/settings — management work that happens outside the active cooking session. The `meals` screen is the landing because it gives the most useful overview (recent cook history and upcoming planned meals).

**Screens that suppress the tab bar entirely:**

`onboarding`, `kitchen`, `recipe`, `editRecipe`, `addRecipe`, `menuImport`, `preview`, `ready`, `cook`

These are either full-screen flows where the bar wastes space, or detail views where Back navigation is the only exit mechanism needed. The tab bar is hidden; the active tab affiliation is preserved in state so returning to the tab restores the correct highlighted tab.

**Tab press behavior:**

- If the pressed tab is already active and the user is on that tab's primary screen, do nothing (no-op or subtle pulse).
- If the pressed tab is already active but the user is on a sub-screen (e.g., inside `recipe` opened from Browse), pop back to the tab's primary screen.
- If the pressed tab is a different tab, navigate to that tab's primary screen.

**Back-button behavior within tabs:**

- `preview` → Back → `home` (within Cook tab)
- `cook` → Back → `preview` (within Cook tab, after confirming "end cook session?")
- `recipe` → Back → `recipeOriginScreen.current` (already implemented via `prevScreen` ref)
- `editRecipe` / `addRecipe` / `menuImport` → Back → `studio`

**Desktop sidebar (≥768px):**

At `768px` and wider, the `BottomNav` is replaced by a vertical `SideNav` rendered on the left edge. It shows icon + label stacked vertically for each tab, same active/inactive states. The main content area shifts right via a CSS grid or flexbox layout class on `Shell`. The sidebar is `64px` wide collapsed (icon only) — no expanded/collapsed toggle in V2; keep it simple.

**Me tab badge:**

A red dot (8px circle, no count) appears on the Me tab icon when the pantry store contains one or more items whose expiry date is within 3 days of today. The dot is positioned top-right of the icon at 11 o'clock. No dot when pantry is empty or no items are near expiry.

---

## Spec

### New files

```
apps/web/src/components/Shell/
  Shell.tsx
  BottomNav.tsx
  SideNav.tsx
  TabButton.tsx
  shell.css
```

### `TAB_CONFIG` — single source of truth

Define in `apps/web/src/components/Shell/tabs.ts`:

```ts
export type TabId = 'cook' | 'browse' | 'studio' | 'me';

export interface TabDef {
  id: TabId;
  label: string;
  primaryScreen: Screen;       // screen navigated to on tab press
  screens: Screen[];           // screens that set this tab as active
  iconName: string;            // maps to icon component
}

export const TABS: TabDef[] = [
  {
    id: 'cook',
    label: 'Cook',
    primaryScreen: 'home',
    screens: ['home', 'preview', 'ready', 'cook'],
    iconName: 'flame',
  },
  {
    id: 'browse',
    label: 'Browse',
    primaryScreen: 'browse',
    screens: ['browse'],
    iconName: 'compass',
  },
  {
    id: 'studio',
    label: 'Studio',
    primaryScreen: 'studio',
    screens: ['studio', 'addRecipe', 'editRecipe', 'menuImport'],
    iconName: 'book-open',
  },
  {
    id: 'me',
    label: 'Me',
    primaryScreen: 'meals',
    screens: ['meals', 'calendar', 'pantry', 'shopping', 'stats', 'settings'],
    iconName: 'person',
  },
];

// Screens that suppress the tab bar entirely
export const SUPPRESSED_SCREENS = new Set<Screen>([
  'onboarding', 'kitchen', 'recipe', 'editRecipe',
  'addRecipe', 'menuImport', 'preview', 'ready', 'cook',
]);

export function tabForScreen(screen: Screen): TabDef | undefined {
  return TABS.find(t => t.screens.includes(screen));
}
```

### `Shell` component

**File:** `apps/web/src/components/Shell/Shell.tsx`

```ts
interface ShellProps {
  screen: Screen;
  setScreen: (s: Screen) => void;
  pantryExpiringCount: number;   // passed down from App; 0 = no badge
  children: React.ReactNode;
}
```

- Renders a `<div className="shell">` with two children: `<main className="shell__content">` (children) and either `<SideNav>` or `<BottomNav>` depending on viewport width.
- Uses a `useMediaQuery('(min-width: 768px)')` hook (or a CSS class + `ResizeObserver`) to switch between `SideNav` and `BottomNav`. Prefer a CSS-driven approach using a `shell--wide` class toggled by the hook, with `SideNav` always rendered but `display: none` on narrow viewports via `shell.css`, to avoid layout flash on resize.
- When `SUPPRESSED_SCREENS.has(screen)`, adds `shell--nav-hidden` class; `shell.css` sets `BottomNav` and `SideNav` to `display: none` under this modifier.
- The active `TabId` is derived: `tabForScreen(screen)?.id ?? lastActiveTab.current`. `lastActiveTab` is a `useRef<TabId>` that updates whenever a non-suppressed screen is active. This ensures that during a suppressed screen (e.g., `cook`), the tab highlight stays on Cook rather than going blank.

### `BottomNav` component

**File:** `apps/web/src/components/Shell/BottomNav.tsx`

```ts
interface BottomNavProps {
  activeTabId: TabId;
  screen: Screen;
  setScreen: (s: Screen) => void;
  pantryExpiring: boolean;
  onTabPress: (tab: TabDef) => void;
}
```

- Renders `<nav className="bottom-nav" aria-label="Main navigation">`.
- Maps `TABS` to `<TabButton>` components.
- Passes `isBadged={pantryExpiring}` only to the `me` tab button.
- Applies `role="tablist"` to the `<nav>`; each `TabButton` has `role="tab"` and `aria-selected`.

### `TabButton` component

**File:** `apps/web/src/components/Shell/TabButton.tsx`

```ts
interface TabButtonProps {
  tab: TabDef;
  isActive: boolean;
  isBadged?: boolean;
  onPress: (tab: TabDef) => void;
}
```

- Renders a `<button className="tab-btn" type="button">` with min tap target `44px × 44px` (enforced via `min-width: 44px; min-height: 44px` in CSS; inner layout can be smaller).
- Children: icon component (filled variant when `isActive`, outlined otherwise) + `<span className="tab-btn__label">` with tab label.
- When `isBadged`, renders `<span className="tab-btn__badge" aria-label="Attention required" />` — an 8px red dot positioned `top: 6px; right: 10px` relative to the button, via `position: absolute` on the button.
- `aria-label` = `tab.label` (the `<span>` label is hidden on very small screens via `font-size: 10px` minimum, not `display:none`, to preserve accessibility tree).
- Active state CSS: `.tab-btn--active .tab-btn__label { color: var(--color-primary); }` and icon uses filled variant. Inactive: `color: var(--color-text-tertiary)`.

### `SideNav` component

**File:** `apps/web/src/components/Shell/SideNav.tsx`

- Same props as `BottomNav`.
- Renders `<nav className="side-nav" aria-label="Main navigation">` at `width: 64px`, left-pinned.
- Each `TabButton` is rendered in vertical stack; icon centered, label beneath at `font-size: 10px`.
- `Shell` applies `padding-left: 64px` to `shell__content` when `SideNav` is visible.
- The badge renders identically to the bottom variant.

### `onTabPress` handler (defined in `Shell`)

```ts
function onTabPress(tab: TabDef) {
  const alreadyActive = tab.id === activeTabId;
  const onPrimaryScreen = screen === tab.primaryScreen;

  if (alreadyActive && onPrimaryScreen) {
    return; // no-op; optionally scroll-to-top the active screen
  }
  if (alreadyActive && !onPrimaryScreen) {
    setScreen(tab.primaryScreen); // pop to tab root
    return;
  }
  setScreen(tab.primaryScreen);
}
```

### `App.tsx` integration

- Wrap existing screen-switching JSX with `<Shell screen={screen} setScreen={setScreen} pantryExpiringCount={...}>`.
- Remove the existing inline tab button rendering from `App.tsx`.
- Pass `pantryExpiringCount` from pantry store: `usePantryStore(s => s.expiringWithinDays(3).length)` — or compute in `App.tsx` from whichever pantry hook already exists.
- The five existing tab handler calls in `App.tsx` (`setScreen('home')`, `setScreen('calendar')`, etc.) are replaced by the `onTabPress` logic in `Shell`.

### `shell.css` — key rules

```css
.shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;          /* dvh for mobile browser chrome */
}

.shell__content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Bottom nav default (mobile) */
.bottom-nav {
  flex-shrink: 0;
  display: flex;
  height: 56px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.shell--nav-hidden .bottom-nav,
.shell--nav-hidden .side-nav {
  display: none;
}

/* Wide viewport: sidebar layout */
@media (min-width: 768px) {
  .shell {
    flex-direction: row;
  }
  .side-nav {
    flex-shrink: 0;
    width: 64px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .bottom-nav {
    display: none;
  }
  .shell__content {
    /* no extra padding needed; shell row layout handles it */
  }
}

.tab-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  flex: 1;
  gap: 2px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  -webkit-tap-highlight-color: transparent;
}

.tab-btn__label {
  font-size: 10px;
  line-height: 1;
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.tab-btn--active .tab-btn__label {
  color: var(--color-primary);
}

.tab-btn__badge {
  position: absolute;
  top: 6px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-danger, #e53e3e);
  border: 1.5px solid var(--color-surface);
  pointer-events: none;
}
```

### Back navigation — no changes required to the model

The `prevScreen` ref and `recipeOriginScreen.current` already exist in `App.tsx`. V2 adds no new back-navigation logic. The spec for each suppressed screen's Back button is:

| Screen | Back goes to |
|--------|-------------|
| `recipe` | `recipeOriginScreen.current` |
| `preview` | `home` |
| `ready` | `preview` |
| `cook` | confirm dialog → `preview` |
| `editRecipe` | `studio` |
| `addRecipe` | `studio` |
| `menuImport` | `studio` |
| `onboarding` | no back |
| `kitchen` | `onboarding` (Skip goes to `home`) |

These Back targets do not require changes to `state.ts` or `validators.ts`.

### `SCREENS` validator update (`validators.ts`)

No new `Screen` values are added by this spec. `SCREENS` set is unchanged.

---

## Data & Dependencies

| Dependency | Source | Used by |
|---|---|---|
| `Screen` union type | `apps/web/src/state.ts` | `tabs.ts`, `Shell`, `BottomNav`, `TabButton` |
| `SCREENS` set | `apps/web/src/validators.ts` | Runtime guard on `setScreen` calls (unchanged) |
| Pantry expiry count | pantry store (Zustand or context) — existing `expiringWithinDays(n)` or equivalent | `Shell` → `BottomNav` → `TabButton` (Me badge) |
| `prevScreen` / `recipeOriginScreen` refs | `App.tsx` | Back targets (unchanged, referenced here for completeness) |
| Icon set | Existing icon components in `apps/web/src/components/icons/` or Heroicons — confirm which set is already in use | `TabButton` — needs filled + outlined variants for: flame, compass, book-open, person |
| `useMediaQuery` hook | Create at `apps/web/src/hooks/useMediaQuery.ts` if not present; otherwise reuse existing | `Shell` — `(min-width: 768px)` breakpoint |
| Theme (`data-theme`) | Set on `<html>` by `App.tsx`; `shell.css` uses CSS custom properties already defined in theme stylesheet — no new theme work needed | `shell.css` |

**Screens touched by this change:**

Every screen is affected in the sense that all screen renders now occur inside `Shell`. No individual screen component needs to change. The inline tab rendering block in `App.tsx` is the only deletion. New files are purely additive.

**Test surface:**

- Unit: `tabForScreen(screen)` returns correct `TabDef` for all 18 `Screen` values
- Unit: `SUPPRESSED_SCREENS` contains exactly the 9 screens listed
- Unit: `onTabPress` logic — active+primary (no-op), active+sub-screen (pop to primary), different tab (navigate)
- Unit: badge — `pantryExpiringCount > 0` → `isBadged=true` on Me `TabButton` only
- Component: `BottomNav` renders 4 buttons; active button has `aria-selected="true"`; suppressed screen → nav hidden
- Component: `SideNav` mirrors `BottomNav` at wide viewport
- e2e: tab press from any screen navigates to correct primary screen
