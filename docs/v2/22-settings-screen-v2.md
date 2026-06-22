# 22 — Settings Screen V2

## Overview

Settings is a full-screen configuration panel accessible via the Me tab. It consolidates all persistent user preferences — appearance, cooking constraints, kitchen hardware, and data management — into a single scrollable page organized by logical sections. Settings does not close on navigation away; it is a proper screen in the state machine, meaning the back button returns the user to wherever they were before (usually the Me tab hub). In V2, the screen gains two new sections (Cooking preferences, About) and a reorganized data section, while shedding the inline kitchen-setup UI that previously lived here in favor of a direct link to the dedicated Kitchen screen.

## Current State

`C:\Tutti\apps\web\src\screens\SettingsScreen.tsx`

The existing screen renders:

- A segmented control for theme: System / Light / Dark — writes to `data-theme` on `<html>` via App.tsx `useEffect`; the no-flash script in `index.html` reads the same stored value on cold load
- Dietary preference chip toggles (Vegetarian, Vegan, Gluten-free, Dairy-free, Nut-free) persisted to localStorage key `tutti.diet`
- Metric / Imperial toggle persisted to localStorage key `tutti.metric`
- A "Kitchen setup" link that navigates to the `kitchen` screen
- "Export my data" — currently exports candidates JSON only (meals, calendar, pantry are excluded)
- "Reset all data" — clears localStorage with no confirmation dialog

What works: theme switching, diet chips, metric toggle, kitchen navigation.

What is broken or missing:
- Export omits meals, calendar entries, and pantry data
- Reset has no confirmation dialog — one tap destroys all user data silently
- No About section (version, GitHub)
- No allergen callout for users who skipped kitchen setup
- Screen is currently reached via the Settings tab (tab 5 of 5); V2 moves it to Me → Settings, eliminating the direct tab

Relevant files:
- `C:\Tutti\apps\web\src\screens\SettingsScreen.tsx` — main component
- `C:\Tutti\apps\web\src\App.tsx` — screen routing, `setTheme` handler, `data-theme` mutation
- `C:\Tutti\apps\web\src\state.ts` — Screen union type includes `"settings"`
- `C:\Tutti\apps\web\src\validators.ts` — SCREENS set includes `"settings"`
- `C:\Tutti\packages\engine\src\types.ts` — RecipeGraph shape (needed for export serialization)

## Problem

From a real user's perspective:

1. **Silent data destruction.** Tapping "Reset all data" wipes everything with no warning. A user who taps it by accident — common on mobile where scroll and tap overlap — loses their recipe library, meal plan, pantry, and calendar with no undo path.

2. **Incomplete export.** A user who wants to back up their data or migrate between devices exports a JSON that is missing three of the four data stores. The export is not usable as a backup.

3. **Allergen gap.** A user who skipped kitchen setup during onboarding has no way to discover that allergens exist as a configuration concept. Diet chips are visible, but allergens (which live in the kitchen screen) are silently absent. There is no nudge connecting the two.

4. **Settings is a top-level tab.** In V2's 4-tab model, Settings does not warrant a permanent tab slot. It is low-frequency — users visit it once at setup and rarely after. Burying it under Me is the right frequency-to-prominence mapping.

5. **No version or attribution.** There is no way for a user to know what version of the app they are running, which matters when reporting bugs or checking if they are up to date.

## V2 Design

**Placement.** Settings becomes a screen navigated to from the Me tab hub, not a direct tab. The Me tab hub is a lightweight list screen; Settings is one of its items. Back from Settings returns to Me.

**Section reorganization.** Four sections replace the flat list:

- *Appearance* — theme and units together, because both affect how the app looks and feels
- *Cooking preferences* — diet chips plus a contextual allergen row; these are the constraints the engine uses when filtering and planning
- *My kitchen* — a single link row to the Kitchen screen; kitchen setup is complex enough to warrant its own screen but Settings is where users expect to find a path back to it
- *Data* — export and reset, separated visually (export is safe, reset is destructive); reset gets a confirmation dialog
- *About* — version and optional GitHub link; low-priority, bottom of page

**Allergen nudge.** If the user has not completed kitchen setup (no allergens stored), the Cooking preferences section shows a secondary row: "Set allergens in kitchen setup →" linking to the kitchen screen. If allergens are set, the row displays a read-only summary ("Tree nuts, Shellfish") and the same link. This bridges the diet/allergen split without duplicating the kitchen UI.

**Export completeness.** The `onExport` handler must collect all four stores before writing the file: candidates (localStorage `tutti.candidates`), meals (localStorage `tutti.meals`), calendar entries (localStorage `tutti.calendar`), and pantry (IndexedDB `recipeStore` → pantry object). The downloaded file is named `tutti-export-YYYY-MM-DD.json`.

**Reset confirmation.** A modal dialog (not a browser `confirm()`) asks "Delete everything? This cannot be undone." with a red "Delete all data" button and a "Cancel" button. The dialog is implemented as a local `useState` boolean — no global modal system needed.

**No account section.** Accounts are deferred to Phase 3. The section does not appear in V2 and no placeholder is shown. Adding placeholder UI for features not yet built creates confusion and support burden.

## Spec

### Component

`SettingsScreen` — default export from `apps/web/src/screens/SettingsScreen.tsx`

### Props Interface

```ts
interface SettingsScreenProps {
  theme: "system" | "light" | "dark";
  onSetTheme: (t: "system" | "light" | "dark") => void;
  diet: string[];                        // e.g. ["vegetarian", "gluten-free"]
  onSetDiet: (d: string[]) => void;
  metric: boolean;
  onSetMetric: (v: boolean) => void;
  onNavigateKitchen: () => void;         // navigates to "kitchen" screen
  onExport: () => void;                  // called by export button; handler lives in App.tsx
  onReset: () => void;                   // called after user confirms; handler lives in App.tsx
}
```

### Local State

```ts
const [showResetConfirm, setShowResetConfirm] = useState(false);
```

No other local state. Theme, diet, and metric are all lifted to App.tsx and passed as props to keep Settings purely presentational and testable.

### Layout

```
<div class="settings-screen">
  <header class="settings-header">
    <button class="back-btn" aria-label="Back" />   {/* chevron left */}
    <h1>Settings</h1>
  </header>

  <div class="settings-body">

    <!-- Section: Appearance -->
    <section class="settings-section" aria-labelledby="section-appearance">
      <h2 id="section-appearance" class="settings-section-title">Appearance</h2>

      <div class="settings-row">
        <span class="settings-row-label">Theme</span>
        <SegmentedControl
          options={["System", "Light", "Dark"]}
          value={theme}
          onChange={onSetTheme}
          aria-label="Color theme"
        />
      </div>

      <div class="settings-row">
        <span class="settings-row-label">Units</span>
        <Toggle
          leftLabel="Metric"
          rightLabel="Imperial"
          value={!metric}
          onChange={(v) => onSetMetric(!v)}
          aria-label="Measurement units"
        />
      </div>
    </section>

    <!-- Section: Cooking preferences -->
    <section class="settings-section" aria-labelledby="section-cooking">
      <h2 id="section-cooking" class="settings-section-title">Cooking preferences</h2>

      <div class="settings-row settings-row--wrap">
        <span class="settings-row-label">Diet</span>
        <div class="chip-group" role="group" aria-label="Dietary preferences">
          {DIET_OPTIONS.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={diet.includes(opt.value)}
              onToggle={() => toggleDiet(opt.value)}
            />
          ))}
        </div>
      </div>

      <!-- Allergen row — always shown -->
      <button
        class="settings-row settings-row--link"
        onClick={onNavigateKitchen}
        aria-label="Set allergens in kitchen setup"
      >
        <span class="settings-row-label">Allergens</span>
        <span class="settings-row-value">
          {allergenSummary /* "Not set" | "Tree nuts, Shellfish" */}
        </span>
        <ChevronRight class="settings-row-chevron" />
      </button>
    </section>

    <!-- Section: My kitchen -->
    <section class="settings-section" aria-labelledby="section-kitchen">
      <h2 id="section-kitchen" class="settings-section-title">My kitchen</h2>

      <button
        class="settings-row settings-row--link"
        onClick={onNavigateKitchen}
        aria-label="Update kitchen setup"
      >
        <span class="settings-row-label">Update kitchen setup</span>
        <ChevronRight class="settings-row-chevron" />
      </button>
    </section>

    <!-- Section: Data -->
    <section class="settings-section" aria-labelledby="section-data">
      <h2 id="section-data" class="settings-section-title">Data</h2>

      <button
        class="settings-row settings-row--action"
        onClick={onExport}
        aria-label="Export my data as JSON"
      >
        <span class="settings-row-label">Export my data</span>
        <span class="settings-row-hint">Downloads tutti-export-YYYY-MM-DD.json</span>
      </button>

      <button
        class="settings-row settings-row--action settings-row--danger"
        onClick={() => setShowResetConfirm(true)}
        aria-label="Reset all data"
      >
        <span class="settings-row-label">Reset all data</span>
      </button>
    </section>

    <!-- Section: About -->
    <section class="settings-section" aria-labelledby="section-about">
      <h2 id="section-about" class="settings-section-title">About</h2>

      <div class="settings-row">
        <span class="settings-row-label">Version</span>
        <span class="settings-row-value">{APP_VERSION}</span>
      </div>

      {GITHUB_URL && (
        <a
          class="settings-row settings-row--link"
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View Tutti on GitHub (opens in new tab)"
        >
          <span class="settings-row-label">View on GitHub</span>
          <ExternalLink class="settings-row-chevron" />
        </a>
      )}
    </section>

  </div>

  {showResetConfirm && (
    <ResetConfirmDialog
      onConfirm={() => { setShowResetConfirm(false); onReset(); }}
      onCancel={() => setShowResetConfirm(false)}
    />
  )}
</div>
```

### Sub-components

**`ResetConfirmDialog`** — local to SettingsScreen.tsx (not exported)

```ts
interface ResetConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}
```

Renders a `<dialog>` element (native HTML) with `open` attribute set. Uses `useEffect` to call `.showModal()` on mount for accessibility focus trapping. Contains:
- `<p>` — "Delete everything? This cannot be undone."
- `<button class="btn-ghost">Cancel</button>`
- `<button class="btn-danger">Delete all data</button>`

The dialog backdrop click calls `onCancel`. Escape key calls `onCancel` via the native `<dialog>` cancel event.

### Constants

```ts
// SettingsScreen.tsx

const DIET_OPTIONS = [
  { value: "vegetarian",  label: "Vegetarian" },
  { value: "vegan",       label: "Vegan" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "dairy-free",  label: "Dairy-free" },
  { value: "nut-free",    label: "Nut-free" },
] as const;

const APP_VERSION = __APP_VERSION__;  // injected by Vite define plugin (see vite.config.ts)
const GITHUB_URL  = __GITHUB_URL__;   // injected; empty string if not set → link hidden
```

`vite.config.ts` additions:
```ts
define: {
  __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  __GITHUB_URL__: JSON.stringify(process.env.VITE_GITHUB_URL ?? ""),
}
```

### Helper: allergenSummary

```ts
// Derived from kitchen localStorage, NOT from props
// Kitchen stores to localStorage key: "tutti.kitchen"
// Kitchen shape (from KitchenScreen): { burners, ovens, allergens: string[] }

function getAllergenSummary(): string {
  try {
    const raw = localStorage.getItem("tutti.kitchen");
    if (!raw) return "Not set";
    const kitchen = JSON.parse(raw);
    const allergens: string[] = kitchen?.allergens ?? [];
    if (allergens.length === 0) return "Not set";
    return allergens
      .map(a => a.charAt(0).toUpperCase() + a.slice(1))
      .join(", ");
  } catch {
    return "Not set";
  }
}
```

Called during render (not in useEffect) — localStorage reads are synchronous and cheap enough here.

### Export handler (App.tsx)

The `onExport` prop is implemented in App.tsx, not in SettingsScreen:

```ts
async function handleExport() {
  // 1. localStorage stores
  const candidates = JSON.parse(localStorage.getItem("tutti.candidates") ?? "[]");
  const meals      = JSON.parse(localStorage.getItem("tutti.meals")      ?? "[]");
  const calendar   = JSON.parse(localStorage.getItem("tutti.calendar")   ?? "[]");
  const kitchen    = JSON.parse(localStorage.getItem("tutti.kitchen")    ?? "{}");

  // 2. IndexedDB pantry (recipeStore)
  const pantry = await readPantryFromIDB();  // existing util from pantry module

  const payload = {
    exportedAt: new Date().toISOString(),
    version: __APP_VERSION__,
    candidates,
    meals,
    calendar,
    kitchen,
    pantry,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `tutti-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Reset handler (App.tsx)

```ts
function handleReset() {
  // Clear all known localStorage keys
  const TUTTI_KEYS = [
    "tutti.candidates", "tutti.meals", "tutti.calendar",
    "tutti.kitchen", "tutti.diet", "tutti.metric",
    "tutti.theme", "tutti.onboarded",
  ];
  TUTTI_KEYS.forEach(k => localStorage.removeItem(k));

  // Clear IndexedDB
  indexedDB.deleteDatabase("tutti");

  // Return to onboarding
  setScreen("onboarding");
}
```

### CSS classes (additions to existing stylesheet)

```css
/* settings-screen.css */

.settings-screen {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;           /* clip child row borders to section corners */
}

.settings-section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface-subtle);
  border-bottom: 1px solid var(--color-border);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  min-height: 52px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  width: 100%;
  text-align: left;
}

.settings-row:last-child {
  border-bottom: none;
}

.settings-row--wrap {
  flex-wrap: wrap;
  align-items: flex-start;
  padding-block: var(--space-3);
}

.settings-row--link {
  cursor: pointer;
  color: inherit;
  text-decoration: none;
}

.settings-row--link:hover,
.settings-row--action:hover {
  background: var(--color-surface-hover);
}

.settings-row--danger .settings-row-label {
  color: var(--color-error);
}

.settings-row-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
  flex: 1;
}

.settings-row-value {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.settings-row-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  display: block;
  margin-top: 2px;
}

.settings-row-chevron {
  color: var(--color-text-muted);
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding-top: var(--space-2);
  width: 100%;
}
```

### Edge cases

| Scenario | Behavior |
|---|---|
| User taps "Reset" then "Cancel" in dialog | `showResetConfirm` → false; nothing cleared |
| Export while IndexedDB pantry read fails | Catch error; export proceeds with `pantry: null`; console.warn logged |
| `tutti.kitchen` key missing | allergenSummary returns "Not set"; allergen row still renders |
| `__GITHUB_URL__` env var not set | Evaluates to `""`; About section renders version only, no GitHub link |
| Kitchen screen opened from allergen row | App.tsx pushes `prevScreen = "settings"` before navigating; back from kitchen returns to settings |
| Kitchen screen opened from "Update kitchen setup" row | Same prevScreen logic — both rows use the same `onNavigateKitchen` prop |
| Vegan selected while Vegetarian is off | Both are independent toggles; no automatic co-selection |
| System theme preference changes while app is open | Handled upstream in App.tsx via `prefers-color-scheme` media query listener; SettingsScreen is not involved |

### Testing surface

The component is fully testable via props alone. Key test cases:

- Renders all five sections
- Chip toggles call `onSetDiet` with correct updated array
- Theme segmented control calls `onSetTheme` with correct value
- Metric toggle calls `onSetMetric` with inverted boolean
- Reset button does not call `onReset` until confirmation dialog "Delete all data" is clicked
- Cancel in confirmation dialog does not call `onReset`
- Allergen row reads from localStorage mock (set `localStorage.setItem("tutti.kitchen", ...)` in test)
- Export button calls `onExport`
- "Update kitchen setup" and allergen row both call `onNavigateKitchen`

## Data & Dependencies

**Reads from:**
- `localStorage["tutti.theme"]` — read by App.tsx, passed as `theme` prop
- `localStorage["tutti.diet"]` — read by App.tsx, passed as `diet` prop
- `localStorage["tutti.metric"]` — read by App.tsx, passed as `metric` prop
- `localStorage["tutti.kitchen"]` — read directly inside SettingsScreen for allergen summary (synchronous, not via prop, because kitchen data is not otherwise needed by the parent at the time Settings renders)
- `package.json` version field — injected at build time via Vite define plugin
- `VITE_GITHUB_URL` environment variable — injected at build time

**Writes to (via App.tsx handlers):**
- `localStorage["tutti.theme"]` via `onSetTheme`
- `localStorage["tutti.diet"]` via `onSetDiet`
- `localStorage["tutti.metric"]` via `onSetMetric`
- All tutti localStorage keys + IndexedDB `tutti` database — cleared by `onReset`

**Navigates to:**
- `kitchen` screen — via `onNavigateKitchen`; App.tsx sets `prevScreen = "settings"` before transition so Back works correctly

**Navigated to from:**
- Me tab hub (V2) — replaces direct Settings tab

**Touches:**
- `App.tsx` — hosts `handleExport`, `handleReset`, theme/diet/metric state and setters; must inject `prevScreen = "settings"` on `onNavigateKitchen` call
- `KitchenScreen.tsx` — destination of the kitchen navigation; no changes required in KitchenScreen itself
- `vite.config.ts` — requires `define` additions for `__APP_VERSION__` and `__GITHUB_URL__`
- `MeScreen.tsx` (new in V2) — the hub screen that renders a row linking to Settings
- `state.ts` / `validators.ts` — `"settings"` already present in Screen union and SCREENS set; no changes needed
