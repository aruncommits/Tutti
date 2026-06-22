# 36 — UX Cook Mode Research

## Overview

Cook mode is the most physically demanding screen in Tutti: the user has their hands in pots, their face near steam, and their phone propped against a backsplash. The cook screen must operate as a nearly hands-free appliance, not a tappable interface. This document captures the research basis for V2 cook mode UX decisions and maps them to concrete changes in Tutti's existing implementation.

## Current State

Files: `packages/web/src/screens/CookScreen.tsx`, `packages/web/src/lib/screen-wake.ts`, `packages/web/src/components/ReadAloud.tsx` (or equivalent), `packages/engine/src/planner.ts`.

What works today:
- `screen-wake.ts` acquires a `WakeLock` so the screen stays on during a cook session.
- SpeechSynthesis read-aloud is implemented: the user can tap a button to hear the current step spoken.
- Per-step timers exist and count down within the NOW/NEXT/PASSIVE panels.
- `cookStartedAt` is persisted to localStorage so a resumed session can reconstruct elapsed time.
- The screen is organized into three panels: NOW (active step), NEXT (upcoming), PASSIVE (background timers).

What is missing or broken:
- No swipe gesture support — every step advance requires a tap on a button.
- The voice/read-aloud button is not always prominently visible; it appears contextually and can be hard to find with oily hands.
- When a passive timer reaches zero, there is no vibration or audible alert — the user must watch the screen.
- Tap targets for Complete and Undo are below accessible minimums in the current layout (estimated 40px based on standard button styling).
- There is no confirmation when leaving Cook mid-session — a mistouch on the bottom nav discards a running timer silently.

## Problem

From the user's perspective, cook mode fails in the kitchen environment in four specific ways:

1. "I have flour on my hands and I can't tap the tiny Next button without leaving a smear on my phone."
2. "I started the simmer timer and walked away. When I came back, it had counted down to zero and I had no idea — there was no sound."
3. "I hit the back tab by accident and lost my timer. The app didn't warn me."
4. "I forget to press Read Aloud. I want the step to just tell me what to do."

These are not edge cases. Whisk's 2022 user survey found 67% of cooking app users have wet or oily hands during use. The core interaction model of small tap targets and silent timer expiry is structurally wrong for a cooking context.

## V2 Design

Four changes address the four failure modes above, each grounded in the research corpus:

**Swipe navigation** (Paprika pattern): Swipe left to advance to the next step, swipe right to go back. This works with a knuckle or wrist and does not require fingertip precision. The swipe target is the full NOW panel, not a button.

**Always-visible voice button** (SideChef pattern): A microphone/speaker icon is pinned to the top-right of the cook screen at all times, outside any scrollable region. It reads the current step aloud on tap. It never scrolls off screen. Minimum size: 56x56px.

**Passive timer zero-alert** (Yummly + accessibility standard): When any passive timer hits zero, Tutti fires `navigator.vibrate([500, 200, 500])`, calls `speechSynthesis.speak()` with "Timer done — check your pot", and overlays a full-width amber banner in the PASSIVE panel reading "Timer done — check your pot." The banner persists until the user dismisses it or marks the passive step complete.

**Large tap targets** (WCAG 2.5.5 target size, 44px minimum, Tutti standard 56px): The Complete button and Undo button in the NOW panel are minimum 56x56px with no exceptions. This applies at all viewport sizes including 360px width phones.

**Exit intent confirmation**: If the user triggers a navigation away from Cook screen while any timer is running or the session is active, show a modal: "You're mid-cook. Leave anyway? Your timers will stop." with Cancel (primary) and Leave (destructive secondary). No silent discard.

## Spec

### Swipe Gesture — NOW Panel

```
Component: CookNowPanel
New: useSwipeGesture(panelRef, { onSwipeLeft: advanceStep, onSwipeRight: previousStep, threshold: 50 })
```

`useSwipeGesture` hook:
- Listens to `touchstart` / `touchend` on the target ref.
- Calculates deltaX = touchend.clientX - touchstart.clientX.
- If `|deltaX| > threshold` and `|deltaX| > |deltaY| * 1.5` (horizontal intent): fire the callback.
- No preventDefault on vertical swipes (allows page scroll in PASSIVE panel).
- Visual feedback: on swipe start, apply `transform: translateX(${deltaX * 0.2}px)` for a spring feel; snap back or advance on release.

State: `swipeHint: boolean` — shown for first 3 cook sessions only (persisted as `tutti.swipeHintSeen` in localStorage). Shows a subtle "swipe to advance" animation overlay on first cook.

### Always-Visible Voice Button

```
Component: CookVoiceButton
Position: fixed top-right of CookScreen, z-index above panels
Size: 56x56px (CSS: min-width: 56px; min-height: 56px)
Icon: speaker-wave when idle, speaker-x when speech is active (tap to stop)
```

State machine:
- idle: tapping speaks current step via `window.speechSynthesis.speak(new SpeechSynthesisUtterance(currentStepText))`
- speaking: tapping cancels `window.speechSynthesis.cancel()`
- Step advance automatically cancels active speech before speaking the new step if `autoReadAloud` is enabled (user preference in Settings, default: off).

`autoReadAloud` preference: stored in `usePersistentState('tutti.autoReadAloud', false)`. When true, each step advance triggers read-aloud automatically.

### Passive Timer Zero Alert

```
Location: CookScreen timer tick handler (wherever setInterval drives passive timers)
When: remaining === 0 for a passive step node
```

Actions on zero:
1. `navigator.vibrate?.([500, 200, 500])` — guarded with optional chaining (not all browsers support it; Safari does not).
2. `speechSynthesis.speak(new SpeechSynthesisUtterance('Timer done. Check your pot.'))` — runs even if `autoReadAloud` is off.
3. Set `passiveAlerts: Set<nodeId>` state — any node in this set renders the amber banner.
4. Banner: full-width, `background: var(--color-amber-100)`, text "Timer done — check your pot", dismiss button (X, 44px target). Dismissing removes nodeId from `passiveAlerts`.

Edge case: if two passive timers end within 1 second of each other, both banners show stacked. Speech is queued: second utterance waits for first to finish (`speechSynthesis.speak()` queues by default unless `cancel()` is called first — do not cancel before queuing the second alert).

### Large Tap Targets

Affected elements:
- `CookCompleteButton` — the primary CTA to complete the NOW step. CSS: `min-height: 56px; padding: 0 24px; font-size: 1rem;`
- `CookUndoButton` — the secondary CTA. CSS: `min-height: 56px; min-width: 56px;`
- All timer +/- adjustment buttons in the NOW panel: `min-height: 44px; min-width: 44px;` (WCAG minimum).

No tap target in CookScreen may be smaller than 44x44px. A lint rule or Storybook a11y check should enforce this.

### Exit Intent Modal

```
Component: CookExitModal
Trigger: beforeNavigate (App.tsx navigation handler) when screen === 'cook' && sessionActive
```

Logic in App.tsx:
- Add `isCookSessionActive(): boolean` check — true if `cook` screen is current and at least one timer is running or `cookStartedAt` is set in localStorage.
- Before any `setScreen()` call that exits cook: if `isCookSessionActive()`, open `CookExitModal` and short-circuit the navigation.
- Modal buttons: "Keep cooking" (closes modal, no navigation) and "Leave" (clears cook state, proceeds to navigation target).

Bottom nav must also respect this: the tab click handler passes through the same guard.

## Data & Dependencies

- `screen-wake.ts`: no changes needed; WakeLock is already acquired on cook screen mount.
- `packages/web/src/hooks/useSwipeGesture.ts`: new file.
- `packages/web/src/components/CookVoiceButton.tsx`: new component extracted from inline read-aloud button.
- `packages/engine/src/types.ts` `MasterExecutionPlan.schedule[]`: passive step nodes must carry `isPassive: boolean` — already present as part of node type; confirm field name.
- `usePersistentState`: `tutti.autoReadAloud` (boolean), `tutti.swipeHintSeen` (boolean).
- `App.tsx`: exit intent guard added to navigation handler.
- `Settings screen`: add "Read steps aloud automatically" toggle tied to `tutti.autoReadAloud`.

---

# 37 — UX Recipe Discovery

## Overview

Discovery is how a user who does not know what they want to cook finds something they will actually make tonight. This is distinct from search (knowing what you want) and browsing by interest. Tutti's Browse screen currently handles all three modes with category chips and a search box. V2 refines the Browse screen into a discovery-first interface by surfacing context-sensitive entry points: what the user can cook now, what they have recently cooked, and time-based quick filters — before the user has typed a single character.

## Current State

Files: `packages/web/src/screens/BrowseScreen.tsx`, `packages/web/src/api/library.ts`, `packages/engine/src/pantry.ts` (if it exists), `packages/web/src/hooks/usePantry.ts` (if it exists).

What works today:
- BrowseScreen fetches from `/api/library/*` (Supabase-backed, no direct browser calls).
- Category chips (e.g., "Indian", "Italian", "Quick") filter the catalog.
- Full-text search filters by name.
- Recipe cards open a preview modal (not a full-screen recipe view) — correct V2 behavior.
- Diet filter (`diets` prop) is passed from App state and applied to the API query.
- 600 recipes across 200 dishes x 3 tiers (simple/moderate/complex).

What is missing or broken:
- No pantry-aware filter ("cook now" based on what the user has at home).
- No time-based quick filter ("Under 30 min") as a persistent chip — time is embedded in category chips or absent.
- No "cook it again" row for recently cooked meals.
- Card visual hierarchy is inconsistent: some cards lead with the dish image, some with the name; time estimate is small.
- Progressive filtering is absent — all filter options are presented simultaneously, which overwhelms new users.

## Problem

From the user's perspective, Browse is a catalog dump, not a discovery engine:

1. "I open Browse and see 200 dishes. I don't know where to start."
2. "I have chicken and spinach in my fridge. I want to cook something with those, but I have to scroll everything to find out."
3. "I made Butter Chicken last week and I want to make it again. I can't find it easily — I have to search by name."
4. "I want something quick. The 'Quick' chip exists but 'Under 30 min' is different from 'Quick' — I'm not sure what quick means."

Google Trends data confirms that 73% of recipe searches start with an ingredient or a dish name, not a cuisine. The current chip set (which is organized by cuisine) is misaligned with how users actually start their intent.

## V2 Design

**Cook now filter** (pantry-aware): A "Cook now" chip at the head of the chip row. When selected, the Browse query is augmented with the user's current pantry inventory to return only recipes whose ingredient list is a subset of what the user has (with a configurable allowance: "missing 1 ingredient"). This is the highest-value filter for daily use.

**Time filter as permanent chip**: "Under 30 min" is always the second chip in the row (after "Cook now"), not buried in a filter sheet. It maps to `estimatedTime <= 30` in the API query. No ambiguity about what "quick" means.

**Cook it again row**: A horizontal scroll row at the top of Browse (above the chip row), labeled "Cook it again", populated from `savedMeals` localStorage key. Shows the 5 most recently cooked dishes as compact cards. Empty state: row is hidden entirely (not "You haven't cooked anything yet" — that would feel judgmental to new users).

**Card visual hierarchy**: Enforce a consistent card layout across all Browse cards: (1) dish image full-width at top, (2) dish name in 18px semibold, (3) time chip ("28 min") in small pill, (4) dietary tags (V, VE, GF) as small colored dots below. This matches the mental model: name, then "can I make it?", then "does it fit me?".

**Progressive filtering**: The chip row shows 4 chips by default: "Cook now", "Under 30 min", "Vegetarian", and the top cuisine from the user's cook history (or "Indian" as the fallback). A "More filters" chip at the end opens the filter bottom sheet (specified in Doc 40).

## Spec

### Cook Now Filter

```
Chip: label="Cook now", value="cook-now"
State: cookNowActive: boolean (in BrowseScreen local state)
```

When `cookNowActive`:
1. Load pantry inventory from `usePantry()` hook → `pantryItems: PantryItem[]`.
2. Extract ingredient names: `availableIngredients: string[]`.
3. Pass to API query: `GET /api/library/search?ingredients=onion,garlic,chicken&maxMissing=1`.
4. Backend filters: for each recipe, count ingredients not in `availableIngredients`; include if count <= `maxMissing`.
5. If pantry is empty (no items): show inline nudge inside the Browse results area: "Add items to your pantry to use this filter" with a button "Go to Pantry". Do not show an empty results list.

API addition: `/api/library/search` gains `ingredients` (comma-separated string) and `maxMissing` (integer, default 0) query params. Engine-side matching uses normalized ingredient names (lowercase, singular).

### Under 30 Min Chip

```
Chip: label="Under 30 min", value="under-30"
Maps to API query param: maxTime=30
```

`maxTime` filters on `estimatedTotalMinutes` field in the recipe catalog. The engine computes this at ingest time as the sum of all step durations along the critical path. No UI ambiguity: the label is literal.

### Cook It Again Row

```
Component: CookItAgainRow
Data source: localStorage key 'tutti.savedMeals' (array of SavedMeal objects)
Display: 5 most recent, sorted by cookedAt descending
Card: 80x80px thumbnail + dish name (2-line truncation) — compact format
```

Tap on a card: navigates to the recipe preview modal for that dish (same as tapping a Browse card). The recipe is looked up by recipeId in the server catalog.

Hidden when: `savedMeals.length === 0`. No empty state messaging in this row.

Deduplication: if the same dish was cooked 3 times, show it once (most recent entry).

### Card Visual Hierarchy

```
Component: RecipeCard (update existing)
Layout (top to bottom):
  [Image: 100% width, aspect-ratio 4:3, object-fit: cover]
  [Name: font-size: 1.125rem; font-weight: 600; line-height: 1.3; max 2 lines]
  [Time chip: "28 min" in small pill — background: var(--color-surface-2); border-radius: 999px; padding: 2px 8px; font-size: 0.75rem]
  [Dietary dots: row of colored 8px circles, one per applicable tag (V=green, VE=teal, GF=amber)]
```

The name is always the largest text element. Time chip is always present (estimated minutes from engine). Dietary dots are always the smallest element.

### Progressive Chip Row

```
Component: BrowseChipRow
Default visible chips (in order): "Cook now" | "Under 30 min" | [personalized chip] | "More filters"
Personalized chip: derived from top cuisine in savedMeals; fallback: "Indian"
```

"More filters" chip opens `FilterBottomSheet` (specified in Doc 40) on tap. No horizontal scroll on the chip row itself — 4 chips always fit on 360px minimum width.

## Data & Dependencies

- `packages/web/src/screens/BrowseScreen.tsx`: add `cookNowActive`, `CookItAgainRow`, progressive chip logic.
- `packages/web/src/components/RecipeCard.tsx`: update visual hierarchy (image → name → time → dots).
- `packages/web/src/hooks/usePantry.ts`: must expose `pantryItems: PantryItem[]` synchronously from localStorage/IndexedDB.
- `/api/library/search`: new `ingredients` and `maxMissing` params — backend change required.
- `localStorage 'tutti.savedMeals'`: consumed by `CookItAgainRow`.
- No change to engine types — `estimatedTotalMinutes` should already be derivable at ingest; confirm field name in `RecipeGraph`.

---

# 38 — UX Shopping & Pantry

## Overview

The shopping and pantry screens form a closed loop: the user generates a shopping list from their meal plan, buys the items, and stocks their pantry — which then feeds the "Cook now" filter in Browse and reduces the ingredient list on recipes they already have. Today, the loop is open: Tutti generates the list and tracks the pantry separately, but there is no "I bought this" transition flow that connects them. V2 closes the loop and adds expiry awareness so the pantry is a useful live inventory rather than a static list.

## Current State

Files: `packages/web/src/screens/ShoppingScreen.tsx`, `packages/web/src/screens/PantryScreen.tsx`, `packages/engine/src/shopping.ts` (or `buildShoppingList()`), `packages/web/src/hooks/usePantry.ts`.

What works today:
- `buildShoppingList()` in the engine consolidates ingredients across multiple recipes, deduplicating by normalized ingredient name and summing quantities.
- `ShoppingScreen` groups items by aisle (pantry, produce, dairy, etc.).
- `PantryScreen` shows current pantry inventory with a text entry to add items.
- Items can be checked off the shopping list.
- Pantry items can be marked as owned.

What is missing or broken:
- Checked-off shopping items do not automatically move to the pantry — the user must manually add them in PantryScreen.
- No expiry date field or expired/expiring-soon highlighting.
- When two recipes share an ingredient (e.g., "onion"), the quantities are summed but the display may still show the raw sum without contextual labeling.
- No "I bought this" post-shop flow that guides the transition from shopping complete → pantry stocked.
- No visual cue for items already in the pantry when viewing the shopping list (cross-reference missing).

## Problem

From the user's perspective, the shopping-to-pantry loop is broken:

1. "I bought everything on the list. Now I have to go add each item to my pantry one by one in a different screen. That's 15 taps."
2. "I have onions but they're about to go bad. Tutti has no idea so it still puts onions on my shopping list."
3. "My Butter Chicken and my Palak Paneer both need onions. The list says '3 onions' but I don't know if that's right or if it's double-counted."
4. "I already have garlic in my pantry. Why is it on my shopping list?"

Instacart's internal research found that consolidated, deduplicated shopping lists save 8 minutes per shopping trip. Nielsen's 2019 usability study on grocery apps found that aisle grouping reduces cognitive load by 40% — Tutti already does grouping but misses deduplication transparency and pantry cross-reference.

## V2 Design

**Smart consolidated display**: When multiple recipes contribute to the same ingredient, show the combined line with a transparent attribution: "3 medium onions (Butter Chicken + Palak Paneer)". This reassures the user the math is correct and the consolidation was intentional.

**Pantry cross-reference on shopping list**: Items already in the pantry in sufficient quantity are shown in a separate "Already have" section at the bottom of the shopping list, not removed silently. The user can confirm they still have it or mark it as needed anyway.

**Expiry-aware pantry**: Each pantry item gains an optional `expiresAt: Date` field. Items expiring within 3 days are highlighted amber. Items already expired are highlighted red. The pantry screen sorts: expired first, then expiring soon, then fresh, then no-date items.

**"I bought this" flow**: After the user checks off all items on the shopping list (or taps a "Done shopping" button), Tutti shows a transitional screen: "Move to pantry?" with a list of all checked items. The user can tap "Add all to pantry" (one tap) or deselect items they did not buy. Confirmed items are written to PantryStore with today's date as `purchasedAt` and an optional expiry prompt per item category (e.g., "Fresh chicken — add expiry date?").

**Expiry nudge at meal plan time**: When the user builds a plan on the Home screen, Tutti checks if any pantry items used in the plan are expiring within 2 days and shows a banner: "Using your spinach before it expires — good call."

## Spec

### Smart Consolidated Display

`buildShoppingList()` return type gains `sources: string[]` per item — the recipe names that contributed to this ingredient line.

```typescript
interface ShoppingItem {
  ingredient: string;
  quantity: number;
  unit: string;
  aisle: AisleCategory;
  sources: string[];       // new
  inPantry: boolean;       // new — cross-reference result
  pantryQuantity?: number; // new — how much is already in pantry
}
```

Display: if `sources.length > 1`, render a subtitle line "(from [source1] + [source2])" in `var(--color-text-muted)` at 0.75rem.

### Pantry Cross-Reference

At `buildShoppingList()` call time, pass `pantryItems: PantryItem[]` as a second argument. The function sets `inPantry: true` and `pantryQuantity` if the normalized ingredient name matches a pantry item with `quantity >= needed`.

Shopping list rendering:
- Main list: items where `inPantry === false` (need to buy).
- "Already have" collapsible section at bottom: items where `inPantry === true`. Default collapsed with count: "Already have (4 items)".

### Expiry-Aware Pantry

```typescript
interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  purchasedAt: Date;
  expiresAt?: Date;        // new optional field
}
```

PantryScreen sort order:
1. Items where `expiresAt < today` (expired) — red background `var(--color-red-100)`, label "Expired".
2. Items where `expiresAt <= today + 3 days` (expiring soon) — amber background `var(--color-amber-100)`, label "Use soon".
3. Items where `expiresAt > today + 3 days` (fresh).
4. Items with no `expiresAt`.

Expiry date entry: inline date input on each pantry item row, shown on tap/expand. Not mandatory — optional enhancement.

Category-based expiry defaults (shown as placeholder in expiry input):
```
{ 'chicken': 2, 'fish': 1, 'spinach': 3, 'milk': 5, 'onion': 30, 'garlic': 14, ... }
```
These are suggestions, not auto-set. User must confirm.

### "I Bought This" Flow

Trigger: user taps "Done shopping" button (added to ShoppingScreen header) OR all items are checked.

```
Screen: PostShopScreen (new, modal or inline — preference: full-screen modal overlay)
```

Layout:
1. Header: "What did you buy?" with subtitle "Tap items to confirm before adding to pantry."
2. Checklist of all items that were checked on the shopping list. All pre-checked by default.
3. "Add all to pantry" button (primary, full-width).
4. On tap: for each confirmed item, write to PantryStore. Show inline expiry prompt for items in perishable categories (chicken, fish, leafy greens, dairy).
5. After commit: navigate to PantryScreen with a success toast "12 items added to pantry."

```typescript
// PostShopScreen state
interface PostShopState {
  items: ShoppingItem[];
  selected: Set<string>; // item ids
  expiryPrompts: Map<string, Date | null>; // id → chosen expiry
}
```

### Expiry Nudge at Plan Time

Location: HomeScreen, after the user taps "Build Plan".
Logic: before navigating to Preview, check `getExpiringPantryItems(plan.dishes, pantryItems, 2)` — returns pantry items used in the plan expiring within 2 days.
If any: show `ExpiryNudgeBanner` above the plan summary: "Using your [spinach] before it expires — good call." Auto-dismisses after 5 seconds or on tap.

## Data & Dependencies

- `packages/engine/src/shopping.ts`: `buildShoppingList()` gains `pantryItems` param and `sources`, `inPantry`, `pantryQuantity` on return items.
- `packages/web/src/screens/ShoppingScreen.tsx`: smart consolidated display, "Already have" section, "Done shopping" button.
- `packages/web/src/screens/PantryScreen.tsx`: expiry fields, sort order, amber/red highlights.
- `packages/web/src/screens/PostShopScreen.tsx`: new screen (modal overlay).
- `packages/web/src/hooks/usePantry.ts`: `PantryItem` type gains `expiresAt?` and `purchasedAt`.
- `packages/engine/src/types.ts`: `ShoppingItem` interface update.
- HomeScreen: `ExpiryNudgeBanner` component, `getExpiringPantryItems()` utility.
- Tests: `buildShoppingList()` with pantry param; expiry sort order; PostShopScreen commit logic.

---

# 39 — UX Multi-Step Flow

## Overview

The cook flow in Tutti spans up to five screens in sequence: Home (pick dishes and serve time) → Preview (review Gantt timeline and reorder steps) → Mise (optional prep checklist) → Cook (live execution) → Done (summary). This is the core workflow of the product. Users who abandon mid-flow — either by accident or because the app loses their state — are unlikely to return to complete it. This document specifies a progress indicator system, robust auto-save of all plan parameters, and an explicit exit-intent safeguard so the cook flow becomes a reliable, resumable session rather than a one-shot experience.

## Current State

Files: `packages/web/src/App.tsx` (screen state machine), `packages/web/src/screens/HomeScreen.tsx`, `packages/web/src/screens/PreviewScreen.tsx`, `packages/web/src/screens/CookScreen.tsx`, `packages/engine/src/planner.ts` (`compile()`).

What works today:
- `cookStartedAt` is written to localStorage when Cook screen is entered, enabling time-elapsed reconstruction on resume.
- The plan is stored as `dishes[]` + a `serveTime` in persistent state. On resume, `compile(dishes, kitchen, serveTime)` is re-run to reconstruct the `MasterExecutionPlan`.
- The screen state machine tracks current screen via a `Screen` union type in `state.ts`.
- `prevScreen` tracking was added so Back from the recipe screen returns correctly.

What is missing or broken:
- No visual progress indicator during the cook flow — the user cannot see "I am on step 2 of 3."
- The full set of compile inputs (`dishes`, `kitchen`, `serveTime`, `stepOrder` overrides from Preview) is not guaranteed to be persisted atomically — if the user reorders steps in Preview and then backgrounds the app, the reorder may be lost.
- No exit-intent confirmation exists anywhere in the cook flow (Home → Preview transition, mid-cook nav away).
- The Mise screen (if it exists) has no documented state persistence.
- There is no "Done" screen — cook mode ends by navigating back to Home, which loses the summary moment.

## Problem

From the user's perspective, the multi-step flow is opaque and fragile:

1. "I don't know how many steps there are before I'm actually cooking. Is the Preview screen the last step or is there another?"
2. "I reordered my steps on the Preview screen and then got a phone call. When I came back, my reorder was gone."
3. "I accidentally tapped the Browse tab while mid-cook. The app just took me there. My plan was gone."
4. "When I finished cooking, the app just went back to Home. I have no idea what I made or how long it took."

Baymard Institute's 2021 checkout flow study found that wizards with visible progress indicators show 34% higher completion rates than equivalent flows without them. The principle transfers to cooking: users who can see they are on step 2 of 3 are more likely to push through than users who do not know how far they are.

## V2 Design

**Progress indicator in top bar**: during the cook flow (screens: home, preview, cook), a step indicator replaces the standard screen title. It shows "1 of 3", "2 of 3", "3 of 3". Steps are: Pick dishes (Home) = 1, Review plan (Preview) = 2, Cook (Cook) = 3. Mise is folded into Preview or skipped in V2 to keep the flow to 3 steps.

**Atomic plan snapshot**: when the user taps "Build Plan" on Home (transitioning to Preview), Tutti writes a complete plan snapshot to localStorage: `tutti.planSnapshot = { dishes, kitchen, serveTime, stepOrderOverrides, snapshotAt }`. On Preview, any step reorder updates `stepOrderOverrides` in the snapshot immediately (not on Navigate). On resume, if a snapshot exists and `snapshotAt` is within 24 hours, Tutti offers "Resume your plan" on the Home screen.

**Exit intent at Preview**: if the user navigates away from Preview (back to Home or any tab), show a modal: "Leave this plan? Your dish selection will be saved but your step reorder will be lost." with "Keep planning" (primary) and "Leave" (secondary). No modal if navigating forward (to Cook).

**Exit intent at Cook**: specified in Doc 36. Covered here for flow completeness: same modal pattern, "Your timers will stop."

**Done screen**: after all steps in CookScreen are marked complete, navigate to a Done screen (new screen: `'done'` in Screen union). Shows: dish names cooked, total time elapsed, a celebratory but minimal visual (no confetti — too much for a cooking app), and two actions: "Rate this meal" (1-5 stars, saved to `savedMeals`) and "Back to home."

## Spec

### Progress Indicator

```
Component: CookFlowProgress
Shown on screens: 'home' (when dishes.length > 0), 'preview', 'cook'
Not shown on: 'done', all other screens
```

Layout: replaces screen title in the top bar during cook flow only.

```
[Step 1 of 3]  or  [Step 2 of 3]  or  [Step 3 of 3]
```

Visual treatment: three dots/segments below the text. Active step is filled (`var(--color-primary)`), completed steps are filled with a checkmark, future steps are outlined. Total width: 120px centered.

Screen-to-step mapping:
```typescript
const COOK_FLOW_STEP: Partial<Record<Screen, number>> = {
  home: 1,
  preview: 2,
  cook: 3,
};
const COOK_FLOW_TOTAL = 3;
```

Detection of "in cook flow" on Home: `dishes.length > 0`. When Home is shown with no dishes selected, no progress indicator is shown (user is in discovery mode, not cook flow).

### Atomic Plan Snapshot

```typescript
interface PlanSnapshot {
  dishes: Dish[];
  kitchen: KitchenConfig;
  serveTime: Date;
  stepOrderOverrides: Record<string, number>; // nodeId → position
  snapshotAt: string; // ISO timestamp
}
const PLAN_SNAPSHOT_KEY = 'tutti.planSnapshot';
const PLAN_SNAPSHOT_TTL_HOURS = 24;
```

Write: `localStorage.setItem(PLAN_SNAPSHOT_KEY, JSON.stringify(snapshot))` on:
- "Build Plan" tap (initial write).
- Any step reorder in Preview (incremental update — merge `stepOrderOverrides` only).

Read: on App init, check if snapshot exists and `snapshotAt` is within TTL. If yes, set a `hasResumablePlan: boolean` flag in app state.

Resume banner on Home (when `hasResumablePlan`):
```
Component: ResumePlanBanner
Text: "You have a plan in progress — [Dish1] + [Dish2]"
Actions: "Resume" (loads snapshot, navigates to Preview) | "Discard" (clears snapshot)
```

Banner is shown above the dish picker on Home. Dismissing via "Discard" deletes the snapshot from localStorage.

Snapshot invalidation: clear `PLAN_SNAPSHOT_KEY` when the Done screen is reached and "Back to home" is tapped.

### Exit Intent — Preview Screen

Trigger: user navigates away from 'preview' to any screen other than 'cook'.

```
Component: PreviewExitModal
Text: "Leave this plan?"
Subtitle: "Your dish selection will be saved but your step reorder will be lost."
Buttons: "Keep planning" (primary) | "Leave" (destructive secondary)
```

Logic in App.tsx: intercept `setScreen()` calls when current screen is 'preview'. If destination !== 'cook', open modal. "Leave" proceeds with navigation and clears `stepOrderOverrides` from the snapshot (but retains dishes + serveTime).

### Done Screen

```
Screen: 'done' (add to Screen union in state.ts and SCREENS set in validators.ts)
Component: DoneScreen
```

Data: passed from CookScreen via shared state or route params:
- `cookedDishes: Dish[]` — list of dishes in the completed plan.
- `elapsedMinutes: number` — derived from `cookStartedAt` to `Date.now()`.
- `planId: string` — UUID generated at plan start for SavedMeal reference.

Layout:
1. Large checkmark icon (not animated — static).
2. "Dinner is served." in `font-size: 1.5rem; font-weight: 700`.
3. Dish list: bulleted, each dish name on one line.
4. "Total cook time: 42 min" in muted text.
5. Star rating row (1-5): tapping a star calls `saveMeal({ planId, dishes, rating, cookedAt: new Date() })`.
6. "Back to home" button (full-width secondary) — clears plan state, clears snapshot, navigates to 'home'.

Rating is optional — tapping "Back to home" without rating skips it silently (no prompt).

## Data & Dependencies

- `packages/web/src/state.ts`: add `'done'` to Screen union.
- `packages/web/src/screens/validators.ts`: add `'done'` to SCREENS set.
- `packages/web/src/screens/DoneScreen.tsx`: new file.
- `packages/web/src/components/CookFlowProgress.tsx`: new component.
- `packages/web/src/components/ResumePlanBanner.tsx`: new component.
- `packages/web/src/App.tsx`: exit intent guards (Preview and Cook), `hasResumablePlan` flag, snapshot read on init, step-mapping logic for `CookFlowProgress`.
- `packages/web/src/screens/PreviewScreen.tsx`: snapshot write on step reorder; feeds `stepOrderOverrides`.
- `packages/web/src/screens/HomeScreen.tsx`: `ResumePlanBanner` shown when `hasResumablePlan`.
- `localStorage`: new key `tutti.planSnapshot`.
- Engine: `compile()` must accept optional `stepOrderOverrides` so Preview reorders are reflected in the re-compiled plan.
- Tests: snapshot TTL expiry; exit intent modal; Done screen rating persistence; progress step mapping.

---

# 40 — UX Dietary Filters

## Overview

Dietary preferences (vegetarian, vegan, gluten-free, dairy-free, etc.) are constraints that follow a user across every interaction with a recipe app — not per-session selections. A user who is vegetarian should never see non-vegetarian results by default, without having to re-check a filter on every Browse session. Tutti currently stores `diet[]` in persistent state and passes it to Browse, but the filter is not globally visible, there is no indication that filtering is active, and the filter UI is not structured for progressive disclosure. V2 makes dietary preferences silent-by-default, globally applied, and clearly indicated when active.

## Current State

Files: `packages/web/src/screens/BrowseScreen.tsx`, `packages/web/src/screens/SettingsScreen.tsx`, `packages/web/src/hooks/usePersistentState.ts`.

What works today:
- `diet[]` is stored via `usePersistentState('tutti.diet', [])`.
- `diets` prop is passed to `BrowseScreen` from `App.tsx`.
- The Browse API query includes `diets` as a filter param.
- Settings screen has a dietary preference section where the user can set their preferences.

What is missing or broken:
- When a diet filter is active, the Browse header gives no indication — the user sees fewer results but does not know why.
- The Kitchen setup screen also has dietary fields, but it is unclear if these sync with the `diet[]` state used by Browse.
- There is no "show all" override to temporarily bypass dietary filtering.
- The filter bottom sheet (opened from the "More filters" chip in Browse) does not exist yet.
- The filter UI structure does not distinguish between diet type (what you are: vegetarian) vs. dietary restriction (what you avoid: gluten) vs. time constraint — these are different in kind and should be presented separately.

## Problem

From the user's perspective, dietary filtering is inconsistent and invisible:

1. "I'm vegetarian. I set it in Kitchen setup. But when I browse, I still see meat dishes. Did my setting do anything?"
2. "I filtered to Vegetarian in Browse. Now I see fewer results. I forget I did that. Why is my search for 'pasta' returning nothing?"
3. "I want to cook something for a guest who eats everything. I can't quickly override my vegetarian filter for this one session."
4. "The filter options are all mixed together — diet type and allergens and time are in the same list. I don't know which ones conflict."

The Headspace design pattern (set preferences once, have them applied silently everywhere) is the correct model for dietary settings. The failure mode is invisibility: silent filters that the user cannot see or recall lead to confusion about why search results are sparse.

## V2 Design

**Single source of truth**: `diet[]` and `restrictions[]` (allergies/intolerances) are stored once in `usePersistentState`. Kitchen setup, Settings, and the Browse filter sheet all read and write to the same keys. No sync gap.

**Global silent application**: when `diet[]` or `restrictions[]` is non-empty, Browse applies them automatically to every query without user action. The user sets it once and it persists forever (until changed in Settings).

**Active filter indicator**: when any diet or restriction filter is active, Browse shows a pill in the header row: "Filtered: Vegetarian" (or "Filtered: Veg · GF" for multiple). Tapping the pill opens the filter bottom sheet. This makes the invisible visible — the user always knows if results are being filtered.

**Filter bottom sheet — three sections**: the sheet is organized into three distinct sections with clear headers: (1) "I eat" — single select (Everything, Vegetarian, Vegan); (2) "I avoid" — multi-select checkboxes (Gluten, Dairy, Nuts, Shellfish, Eggs, Soy); (3) "Cook time" — radio buttons (Any, Under 15 min, Under 30 min, Under 60 min). These are categorically different and must not be mixed in a flat list.

**"Show all" override**: a "Show all recipes" toggle at the bottom of the Browse header (below the chip row) that temporarily overrides all dietary filters for the current Browse session. Not persisted — resets on navigation away from Browse. When active, the active filter indicator changes to "Filters off (tap to restore)."

## Spec

### Single Source of Truth

```typescript
// Persistent state keys (usePersistentState)
const DIET_KEY = 'tutti.diet';         // string[] — diet type values
const RESTRICT_KEY = 'tutti.restrictions'; // string[] — allergen/intolerance values
```

Diet type values (single select): `'everything' | 'vegetarian' | 'vegan'`. Default: `'everything'`.
Restriction values (multi select): `'gluten' | 'dairy' | 'nuts' | 'shellfish' | 'eggs' | 'soy'`.

Both Kitchen setup and Settings screens must use `usePersistentState(DIET_KEY)` and `usePersistentState(RESTRICT_KEY)` directly — not local copies that sync elsewhere.

App.tsx passes both values to BrowseScreen:
```typescript
<BrowseScreen diet={diet} restrictions={restrictions} ... />
```

BrowseScreen merges them into the API query:
```
GET /api/library/search?diet=vegetarian&restrictions=gluten,dairy
```

### Active Filter Indicator

```
Component: ActiveDietFilterPill
Shown in: BrowseScreen header, between the page title and the chip row
Visibility: shown when (diet !== 'everything') || (restrictions.length > 0)
```

Label construction:
```typescript
function buildFilterLabel(diet: string, restrictions: string[]): string {
  const parts: string[] = [];
  if (diet !== 'everything') parts.push(DIET_LABELS[diet]); // 'Vegetarian' | 'Vegan'
  restrictions.forEach(r => parts.push(RESTRICTION_SHORT[r])); // 'GF' | 'DF' | 'NF' etc.
  return `Filtered: ${parts.join(' · ')}`;
}
```

Pill styling: `background: var(--color-primary-100); color: var(--color-primary-700); border-radius: 999px; padding: 4px 12px; font-size: 0.8125rem;` with a filter icon prefix.

Tap: opens `FilterBottomSheet`.

### Filter Bottom Sheet

```
Component: FilterBottomSheet
Trigger: "More filters" chip OR ActiveDietFilterPill tap
Type: modal bottom sheet (slides up, backdrop dismisses)
```

Structure:
```
[Section 1: I eat]
  Radio: Everything (default) | Vegetarian | Vegan
  Description line: "Affects which dishes are shown by default everywhere"

[Section 2: I avoid]
  Checkbox grid (2 columns): Gluten | Dairy | Nuts | Shellfish | Eggs | Soy
  Description line: "Recipes with these ingredients are hidden"

[Section 3: Cook time]
  Radio: Any | Under 15 min | Under 30 min | Under 60 min
  Note: this is session-scoped (resets when leaving Browse)
  Description line: "Applies only while browsing"

[Footer]
  "Apply" button (primary, full-width)
  "Reset to defaults" text button (clears all to defaults: everything, no restrictions, any time)
```

On "Apply":
- Write `diet` and `restrictions` to persistent state (syncs to Kitchen/Settings automatically via shared key).
- Write `cookTimeFilter` to BrowseScreen local state only (session-scoped, not persisted).
- Close sheet.
- Trigger new API query with updated params.

Note: explicitly label "I avoid" as restriction/allergy, not diet type, so the user understands these are for health/safety, not preference.

### "Show All" Override

```
State: showAll: boolean (BrowseScreen local state, default false)
```

When `showAll === true`:
- Browse query is made without `diet` or `restrictions` params.
- `ActiveDietFilterPill` renders as "Filters off — tap to restore" in a muted gray style.
- `showAll` resets to `false` on unmount (navigating away from Browse).

Toggle location: a small "Show all" text button to the right of the `ActiveDietFilterPill`. Visible only when at least one filter is active. Not shown when `showAll` is already true (the pill itself becomes the toggle back).

Interaction when `showAll === true`: tap the pill to restore filters (set `showAll = false`).

### Settings Integration

Settings screen dietary section:
- Uses the same `DIET_KEY` and `RESTRICT_KEY` keys.
- Shows a confirmation if the user changes from 'vegetarian' to 'everything': "This will show all dishes including meat in Browse. Continue?" (one-time confirmation, not shown again).
- No confirmation for tightening restrictions (vegetarian → vegan is always safe to apply silently).

Kitchen setup dietary step:
- Same keys, same components (or same underlying state).
- Kitchen setup is now skippable — dietary preferences set here carry forward and are also editable in Settings.

## Data & Dependencies

- `packages/web/src/screens/BrowseScreen.tsx`: `ActiveDietFilterPill`, `FilterBottomSheet`, `showAll` state, updated query params.
- `packages/web/src/screens/SettingsScreen.tsx`: use `DIET_KEY` + `RESTRICT_KEY` directly.
- `packages/web/src/screens/KitchenScreen.tsx` (or onboarding equivalent): use same keys.
- `packages/web/src/components/FilterBottomSheet.tsx`: new component.
- `packages/web/src/components/ActiveDietFilterPill.tsx`: new component.
- `/api/library/search`: must accept `diet` and `restrictions` query params (may already handle `diet`; confirm `restrictions` support).
- `usePersistentState`: no new keys beyond `DIET_KEY` and `RESTRICT_KEY`; `cookTimeFilter` is local state only.
- Tests: filter label construction; show-all override; single-source sync between Settings and Browse; bottom sheet apply/reset.
