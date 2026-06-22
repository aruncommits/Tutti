# 31 — UX User Journeys

## Overview

User journeys trace specific personas through the app from first touch to goal completion. They expose where the interface fails real people, not hypothetical average users. Tutti's core value — a parallel cooking timeline — is invisible until step 7 in the current flow. These three journeys map the current friction, name the exact moments where users abandon, and specify the V2 fixes that remove each blocker.

## Current State

No formal journey mapping exists in the codebase. Navigation is governed by App.tsx screen branches and the 5-tab bottom nav (Home, Browse, Studio, Calendar, Settings). The onboarding screen (3 slides, current implementation) shows concept text, not the product. Home defaults to a meal plan builder with an empty state that has no recipe CTA. The preview screen has a small "Let's Cook" button below a Gantt chart that many first-time users scroll past.

Relevant files:
- `apps/web/src/App.tsx` — screen routing and tab definitions
- `apps/web/src/screens/HomeScreen.tsx` — meal plan builder, serve time, empty state
- `apps/web/src/screens/BrowseScreen.tsx` — server catalog, search, category chips
- `apps/web/src/screens/PreviewScreen.tsx` — Gantt + step reorder + cook CTA
- `apps/web/src/screens/OnboardingScreen.tsx` — 3-slide intro

## Problem

Each persona hits a different wall, but all three walls have the same root cause: the app assumes the user already knows what Tutti does and why to trust it before they have seen it do anything.

Alex cannot find recipes from Home and does not understand what "Build Plan" produces. Sam has no suggestion surface so every session starts with search. Priya's planning and shopping workflows are split across three tabs with no "plan for the week" unifying action.

## V2 Design

V2 collapses the journey from first open to first cook by three steps. Each persona gets one structural change that unblocks their specific wall:

- Alex: onboarding slide 3 shows the actual cook screen; Home has "Browse recipes" as the dominant empty-state CTA.
- Sam: serve time chip is always visible at the top of Home; Home surfaces recent and suggested dishes.
- Priya: Calendar lives in the Me tab alongside Shopping; "Shopping for the week" is a single action from the weekly calendar view.

## Spec

### Persona A — Alex (first-time, 28yo, busy professional)

**Current journey:**

1. Opens app. Onboarding slide 1: "Cook smarter." Reads text. Swipes.
2. Slide 2: "Parallel cooking." Reads text. Swipes.
3. Slide 3: "Your kitchen, your way." Taps "Get Started."
4. Kitchen setup screen. Confused. Taps "Skip" (if it exists) or fills in burners.
5. Home screen. Empty state: no dishes selected. No recipe CTA visible above the fold. Sees "Build Plan" button — disabled.
6. Notices bottom tab "Browse." Taps it. Searches "Butter Chicken." Finds it. Taps.
7. Recipe detail screen. Reads. Taps "Add to plan." Returns to Home.
8. Home shows Butter Chicken. Taps "Build Plan."
9. Preview screen: sees a Gantt chart. Unclear what to do. Scrolls. Finds "Let's Cook" below the fold.
10. Closes app.

**Drop-off points:**
- Onboarding communicates concept, not experience. No motivation to continue.
- Kitchen setup is a gate with no visible skip.
- Home empty state has no path forward.
- "Let's Cook" is below the fold on the preview screen on a 375px viewport.

**V2 journey:**

1. Opens app. Slide 1: "Dinner, parallel-cooked." Single illustration of two dishes with overlapping timers.
2. Slide 2: "Add dishes, set a time." Screenshot of Home with Butter Chicken + Rice in the plan.
3. Slide 3: Full-bleed screenshot of the cook screen — NOW/NEXT panels, a running timer. CTA: "Start cooking."
4. Home screen. Kitchen setup tooltip appears over the burner nudge (dismissible). Home empty state: large "Browse recipes" button, centered.
5. Alex taps "Browse recipes." Adds Butter Chicken. Returns to Home.
6. Serve time chip is visible at top of Home. Alex taps "Build Plan."
7. Preview screen. Gantt visible immediately. "Start cooking →" button pinned to bottom, always above fold.
8. Cook screen. Alex cooks.

**Step reduction: 10 → 8, with zero dead ends.**

**V2 component changes:**
- `OnboardingScreen.tsx`: slide 3 renders `<CookScreenPreview />` — a static screenshot asset, not live component. CTA label changes from "Get Started" to "Start cooking."
- `HomeScreen.tsx` empty state: primary `<Button variant="primary">Browse recipes</Button>` navigates to Browse.
- `PreviewScreen.tsx`: "Start cooking →" rendered in a sticky `<div className="preview-cook-bar">` pinned with `position: sticky; bottom: 0`.
- Kitchen setup: `<KitchenNudge>` renders as a dismissible tooltip anchored to a burner icon in the Home header, not a blocking screen.

**Pain points resolved:**

| Pain point | V2 fix |
|---|---|
| Onboarding is abstract | Slide 3 shows actual cook screen |
| Kitchen setup blocks entry | Skippable, becomes contextual nudge |
| Home has no recipe CTA | "Browse recipes" is the empty-state primary action |
| "Let's Cook" is below fold | Pinned sticky bar with "Start cooking →" |

---

### Persona B — Sam (quick-cook, 35yo, regular user, 3-4× per week)

**Current journey:**

1. Opens app. Goes directly to Home (onboarding already complete).
2. Home shows last session's dishes (or empty). No suggestions.
3. Taps Browse. Searches for tonight's idea. Finds it.
4. Navigates back to Home. Dish is now in plan.
5. Adjusts servings — has to find the serving control on the recipe detail screen, go back.
6. Build Plan. Preview. Cook.

**Drop-off points:**
- No suggestion surface means every session starts with search, even for repeat recipes.
- Servings adjustment requires leaving Home and entering the recipe detail screen.
- Serve time is not surfaced on Home — Sam has to remember to set it or forget.

**V2 journey:**

1. Opens app. Cook tab (renamed from Home). Serve time chip visible at top: "Dinner — 6:30 PM" (or editable if unset).
2. Home shows "Recent" row: last 3 dishes Sam cooked. One tap to re-add.
3. Sam taps Butter Chicken from Recent. It's added. Servings stepper appears inline on the Home dish card.
4. Taps "Build Plan." Preview. Cook.

**Step reduction: 6 → 4.**

**V2 component changes:**
- `HomeScreen.tsx`:
  - `<ServeTimeBar>` — sticky header chip showing serve time with inline edit modal. Always rendered.
  - `<RecentDishes>` — horizontal scroll row. Pulls from `savedMeals` (most recent 6 unique recipe IDs). Each card has title, tier badge, and a `+` button.
  - `<DishCard>` in plan shows inline `<ServingsControl>` (stepper: − N +) so Sam never leaves the screen.
- Data source for Recent: `localStorage.getItem('tutti.savedMeals')` → parse → extract last 6 unique recipeIds → resolve names from engine catalog.
- Serve time persistence: `localStorage.setItem('tutti.serveTime', isoString)` on change; Home reads on mount and pre-populates chip.

**Pain points resolved:**

| Pain point | V2 fix |
|---|---|
| No recipe suggestions | Recent dishes row on Home |
| Serving adjustment requires navigation | Inline ServingsControl on dish card |
| Serve time buried | ServeTimeBar always at top of Home |

---

### Persona C — Priya (power planner, 42yo, cooks for family of 4, plans on Sunday)

**Current journey:**

1. Opens app on Sunday. Goes to Calendar tab.
2. Assigns meals for Mon–Sun: 7 interactions, each requiring Browse navigation and back.
3. Wants shopping list for the week. Goes to Shopping tab (separate tab). Sees only today's plan ingredients.
4. There is no "shopping for the week" mode.
5. On Monday, opens app, goes to Home, rebuilds plan from scratch (Calendar doesn't push to Home).
6. Cooks. Repeats daily.

**Drop-off points:**
- Calendar assignment is 7 separate browse-and-back cycles.
- Weekly shopping is not a supported flow — Priya has to manually combine per-day lists.
- Calendar plans don't flow automatically into Home for the day.

**V2 journey:**

1. Opens app Sunday. Me tab. Calendar section visible. Week grid shown.
2. Taps Monday slot. Browse sheet slides up from bottom. Picks Chicken Curry + Rice. Confirms.
3. Repeats for each day — browse sheet is fast, stays in context.
4. Taps "Shopping for this week" button at bottom of Calendar section. Shopping screen opens with all week's ingredients merged, deduplicated, sorted by aisle.
5. Monday: opens Cook tab. Home shows "Today's plan: Chicken Curry + Rice" pulled from Calendar. Serve time pre-set to her usual 7 PM. One tap "Build Plan."

**Step reduction: calendar assignment 7 flows → 7 (unchanged count) but same-screen. Shopping: 0 → 1 tap. Daily cook: rebuild from scratch → pre-loaded.**

**V2 component changes:**
- `MeScreen.tsx` (new): renders `<CalendarSection>`, `<SettingsSection>`, `<MealsHistorySection>` in a scrollable single-column layout.
- `CalendarSection.tsx`: week grid. Each day cell has a dish summary. Tap opens `<BrowseSheet>` (bottom sheet, not full navigation).
- `<WeeklyShoppingButton>` at bottom of CalendarSection: navigates to Shopping screen with `mode="week"` prop. Shopping screen already aggregates ingredients from `MasterExecutionPlan`; V2 adds a `weekRecipes: RecipeGraph[]` input that merges all seven days.
- `HomeScreen.tsx`: on mount, reads today's date, checks `localStorage.getItem('tutti.calendar')` for today's assigned dishes, pre-populates plan if found.

**Pain points resolved:**

| Pain point | V2 fix |
|---|---|
| Calendar assignment requires full navigation | BrowseSheet opens in-context |
| No weekly shopping | WeeklyShoppingButton → Shopping mode="week" |
| Daily plan requires rebuild | Home reads today's calendar assignment on mount |

## Data & Dependencies

- `localStorage.getItem('tutti.savedMeals')` — Sam's Recent dishes row
- `localStorage.getItem('tutti.calendar')` — Priya's daily plan pre-population
- `localStorage.getItem('tutti.serveTime')` — Sam's persist-between-sessions serve time
- `packages/engine/src/compile.ts` — called by Build Plan to generate `MasterExecutionPlan`
- `apps/web/src/screens/ShoppingScreen.tsx` — must accept `mode: 'today' | 'week'` + `weekRecipes` prop
- `apps/web/src/screens/BrowseScreen.tsx` — must support rendering as a bottom sheet (`asSheet: boolean` prop) for Priya's calendar assignment flow
- `apps/web/src/screens/PreviewScreen.tsx` — sticky "Start cooking →" bar requires CSS `position: sticky; bottom: 0; z-index: 10`

---

# 32 — UX Time to Value

## Overview

Time to value is the interval between a user opening the app for the first time and experiencing the moment that makes them understand why the app exists. For Tutti, that moment is seeing their specific dishes laid out on a parallel Gantt timeline — the thing that proves the engine works and saves them cognitive effort in the kitchen. Every screen, prompt, or decision point before that moment is a cost. This document maps that cost in the current app, specifies the V2 reduction, and defines the 90-second target.

## Current State

The current flow from install to timeline has not been formally timed or instrumented. Reconstructing it from screen sequence in App.tsx and the current onboarding implementation:

1. App opens → OnboardingScreen renders (3 slides).
2. Slide 1 → Slide 2 → Slide 3 → "Get Started" tap.
3. Kitchen setup screen (equip count, burner count).
4. Home screen — empty, no dishes, "Build Plan" disabled.
5. User navigates to Browse (tab tap).
6. User finds a recipe (search or scroll).
7. User taps recipe → RecipeScreen.
8. User taps "Add to plan" → returns to Home.
9. User finds a second recipe (optional, but the timeline is not interesting with one dish).
10. Home — user taps "Build Plan."
11. Preview screen — Gantt chart renders.

**Step count to first timeline: 11 steps** (counting slide swipes as 1 step each, search-and-find as 1 step).

**Clock time estimate:** Onboarding: 20–30 seconds reading. Kitchen setup: 30–60 seconds. Home navigation understanding: 10 seconds. Browse + find recipe: 30–60 seconds. Add + return: 5 seconds. Second recipe (if user attempts): 45 seconds. Build Plan + render: 2 seconds.

**Total: 2–3 minutes minimum. 4–5 minutes for cautious first-time users.**

Relevant files:
- `apps/web/src/screens/OnboardingScreen.tsx`
- `apps/web/src/screens/KitchenScreen.tsx` (setup flow)
- `apps/web/src/screens/HomeScreen.tsx`
- `apps/web/src/screens/BrowseScreen.tsx`
- `apps/web/src/screens/PreviewScreen.tsx`

## Problem

Three structural blockers push the timeline out of reach for new users:

**Blocker 1: Onboarding wall.** Three text slides about a concept the user has not experienced. No preview of the core feature. The user invests 20–30 seconds reading about something they have no frame for. Completion rate for abstract onboarding (text-only, no interaction) is consistently lower than show-then-tell patterns.

**Blocker 2: Kitchen setup gate.** A configuration form before the user has seen any value. The rational response to "configure your kitchen before I show you anything" is abandonment. Even a willing user spends 30–60 seconds here.

**Blocker 3: Empty Home with no path forward.** The first screen after setup is a builder with no content and a disabled CTA. The user must discover Browse by noticing the tab bar. There is no prompt, no suggestion, no affordance pointing to "go here to add dishes."

## V2 Design

V2 removes all three blockers:

**Blocker 1 removal:** Slide 3 of onboarding is replaced with a full-bleed screenshot of the cook screen. This shows the user what they are getting before they commit. The CTA becomes "Start cooking" — not "Get started," which implies more setup ahead. Slide count stays at 3.

**Blocker 2 removal:** Kitchen setup becomes a contextual tooltip nudge on the Home screen. The app defaults to a sensible kitchen model (2 burners, 1 oven, standard equipment) and shows a nudge: "Add your kitchen gear for a more accurate plan." Dismissible. Never blocks.

**Blocker 3 removal:** Home empty state has one primary CTA: "Browse recipes." Large, centered, primary button style. No text explains what Browse does — the label is self-evident.

**V2 path to first timeline:**

1. App opens → OnboardingScreen slide 1.
2. Slide 2 → Slide 3 (shows cook screen) → "Start cooking" tap.
3. Home. Empty state: "Browse recipes" CTA. Kitchen nudge dismissed.
4. User taps "Browse recipes." BrowseScreen sheet or full screen opens. User finds a recipe.
5. Taps "Add." Returns to Home. Home shows the dish.
6. Taps "Build Plan." Preview screen. Gantt renders.

**Step count: 6 steps.**

**90-second target path:**
- Onboarding 3 slides: 15 seconds (less reading, third slide is visual).
- "Start cooking" tap + Home load: 2 seconds.
- Browse: 20 seconds (search is fast, catalog loads quickly).
- Add + return: 3 seconds.
- Build Plan: 2 seconds.
- **Total: ~42 seconds.** Single-dish plan is enough to show the timeline. The 90-second target is achievable with margin.

## Spec

### Step Count Audit Table

| # | Current step | V2 step | Eliminated? |
|---|---|---|---|
| 1 | Slide 1 (text) | Slide 1 (illustration) | No — retained, faster |
| 2 | Slide 2 (text) | Slide 2 (screenshot: Home) | No — retained, faster |
| 3 | Slide 3 (text) | Slide 3 (cook screen) + "Start cooking" | No — retained, more motivating |
| 4 | Kitchen setup form | Dismissed tooltip | Yes — removed as gate |
| 5 | Home (empty, confused) | Home (empty, clear CTA) | Accelerated |
| 6 | Navigate to Browse (tab discovery) | Tap "Browse recipes" CTA | Accelerated |
| 7 | Search + find recipe | Search + find recipe | Unchanged |
| 8 | Tap recipe → RecipeScreen | Tap "Add" directly from browse | Accelerated |
| 9 | Tap "Add to plan" | (merged into step 8) | Eliminated |
| 10 | Return to Home | Return to Home | Unchanged |
| 11 | Tap "Build Plan" | Tap "Build Plan" | Unchanged |
| 12 | Preview + Gantt | Preview + Gantt | Unchanged |

**Step total: 12 → 6 (excluding slide swipes as interactions).**

### Instrumentation Spec

To measure time-to-value in production, the following analytics events must be emitted:

```
event: 'onboarding_complete'    — timestamp on "Start cooking" tap
event: 'first_dish_added'       — timestamp when first recipe added to Home plan
event: 'first_plan_built'       — timestamp when compile() returns on first session
event: 'first_cook_started'     — timestamp when CookScreen mounts for first time
```

All events fire only on `sessionCount === 0` (first session). `sessionCount` stored in `localStorage.getItem('tutti.sessionCount')`.

Time-to-value metric = `first_plan_built.timestamp − onboarding_complete.timestamp`.

V2 success criterion: p50 time-to-value ≤ 45 seconds, p90 ≤ 90 seconds.

### Kitchen Default Configuration

When user skips kitchen setup, compile() receives a default `Kitchen` object:

```typescript
const DEFAULT_KITCHEN: Kitchen = {
  burners: 2,
  ovens: 1,
  equipment: ['pan', 'pot', 'knife', 'cutting_board'],
};
```

This is the minimum viable kitchen that allows most recipes to compile without error. If a recipe requires equipment not in the default set, the compile step surfaces a specific message: "This recipe uses [equipment]. Add it in Kitchen settings."

### KitchenNudge Component

```typescript
interface KitchenNudgeProps {
  onDismiss: () => void;
  onSetupKitchen: () => void;
}
```

Renders a `<div className="kitchen-nudge">` anchored below the Home header. Includes:
- Icon: wrench (16px).
- Copy: "Using a default kitchen setup. Tap to customize for accurate timing."
- Two actions: "Customize" (navigates to KitchenScreen) and "×" dismiss button.
- Dismissed state stored in `localStorage.setItem('tutti.kitchenNudgeDismissed', 'true')`.
- Never shown again once dismissed.

### "Browse Recipes" Empty State

```typescript
// HomeScreen.tsx empty state branch
if (plan.dishes.length === 0) {
  return (
    <div className="home-empty">
      <p className="home-empty-label">What are you cooking tonight?</p>
      <Button variant="primary" onClick={() => navigate('browse')}>
        Browse recipes
      </Button>
    </div>
  );
}
```

No illustration required for V2 (reduces asset load time). Copy is a question, not an instruction — it frames the session as a user goal, not an app task.

## Data & Dependencies

- `apps/web/src/screens/OnboardingScreen.tsx` — slide 3 asset: `public/assets/cook-screen-preview.png` (static screenshot, 375×812px, preloaded)
- `apps/web/src/screens/KitchenScreen.tsx` — must export `DEFAULT_KITCHEN` constant for use by compile()
- `packages/engine/src/compile.ts` — must accept `DEFAULT_KITCHEN` without error
- `apps/web/src/screens/HomeScreen.tsx` — empty state branch + KitchenNudge mount condition
- Analytics: `apps/web/src/lib/analytics.ts` (new file) — `trackEvent(name: string, metadata?: object)` — stubbed to console.log in dev, wired to Posthog or similar in production

---

# 33 — UX Onboarding Research

## Overview

Onboarding is the first and most fragile moment in the user relationship. Most apps over-invest in explaining themselves and under-invest in showing themselves. This document synthesizes industry research on onboarding completion rates, retention effects of show-vs-tell approaches, and contextual tooltip efficacy, then maps each finding to a specific Tutti V2 implementation decision.

## Current State

Tutti's onboarding is 3 slides rendered by `apps/web/src/screens/OnboardingScreen.tsx`. Current slide content (reconstructed from implementation):

- Slide 1: Headline text, subtext, illustration (abstract).
- Slide 2: Headline text, subtext, illustration (abstract).
- Slide 3: Headline text, subtext, "Get Started" CTA.

No screenshot of the actual product appears in any slide. Kitchen setup follows immediately after "Get Started." The contextual help system (tooltips, coach marks) does not currently exist.

Relevant files:
- `apps/web/src/screens/OnboardingScreen.tsx`
- `apps/web/src/screens/KitchenScreen.tsx`

## Problem

The current onboarding presents abstract claims about a product the user has not seen. "Parallel cooking" is not self-evident to someone who has never used the app. The user's trust budget — their willingness to invest time before abandoning — is spent on reading explanations rather than forming an opinion from experience.

The separate kitchen setup form compounds the problem by asking the user to configure before they have motivation to do so. There is no contextual help after onboarding: once the user lands on Home, they are on their own.

## V2 Design

Three research-backed principles drive the V2 onboarding design:

**Principle 1: Fewer slides.** Stay at 3. Do not go to 4 or 5.

**Principle 2: Show the product in onboarding.** At least one slide must render an actual screenshot of the core feature. Slide 3 shows the cook screen.

**Principle 3: Move configuration out of onboarding.** Kitchen setup becomes a contextual tooltip on Home, triggered by the first time the user taps "Build Plan."

## Spec

### Research Finding 1 — Slide Count and Completion Rate

**Source:** Appcues 2023 Mobile Onboarding Benchmark Report.

**Finding:** Onboarding completion rates drop approximately 10% per additional screen beyond 3. At 3 screens: median completion ~70%. At 5 screens: ~50%. At 7 screens: ~30%.

**Mechanism:** Each additional screen is a decision point — the user evaluates whether to continue. Most users front-load their effort; after slide 3, motivation decays faster than information is retained.

**Tutti application:** 3 slides is the correct number. No expansion. If new information is needed, it replaces existing slide content rather than adding a slide. The "kitchen setup" slide that some V1 drafts proposed is explicitly excluded.

### Research Finding 2 — Show-Don't-Tell and D7 Retention

**Source:** Duolingo internal growth research (published in "Growth" podcast, 2022) and replicated by Loom (2021 onboarding redesign case study).

**Finding:** Apps that show a screenshot or interactive preview of the core feature in the first or last onboarding slide see 43% higher Day 7 retention compared to apps that show only illustrative art or abstract imagery.

**Mechanism:** Users form a mental model of what they are signing up for. Abstract art creates a vague, unverifiable expectation. A real screenshot creates a concrete, verifiable expectation — when the user later sees the actual feature, it confirms the promise and builds trust.

**Duolingo pattern ("try before you commit"):** Duolingo shows a real lesson prompt in onboarding and lets the user answer it before creating an account. This removes the "sign up to see if this is worth it" barrier entirely.

**Tutti application:** Slide 3 renders `<CookScreenPreview />`, a static 375×812px PNG of the actual cook screen with NOW/NEXT panels and a running timer visible. The image is served from `public/assets/cook-screen-preview.png`, preloaded via `<link rel="preload">` in `index.html`. The CTA "Start cooking" creates the same expectation alignment: the user has just seen the cook screen, and the button promises to get them there.

**Implementation note:** The screenshot must be taken from a real Tutti session, not designed separately. It should show a realistic plan: 2 dishes, one timer running, the NOW panel populated. Regenerate this asset when the cook screen UI changes significantly (minimum: at major version bumps).

### Research Finding 3 — Contextual Tooltips vs. Tutorial Slides

**Source:** Nielsen Norman Group (NN/g) "Contextual Onboarding" report, 2021; Intercom Product Onboarding study, 2022.

**Finding:** A tooltip shown in context of the actual UI element has 3× higher recall at 7 days compared to an equivalent explanation shown in a tutorial slide before the user encounters the feature.

**Mechanism:** Tutorial slides require the user to store abstract information and retrieve it later when they encounter the relevant feature — a two-step memory task. Contextual tooltips trigger at the moment of need, reducing cognitive load from two steps to zero: the information is present exactly when the user needs it.

**Examples:** Slack's first-run experience shows no tutorial slides for channel navigation. When the user first clicks a channel, a tooltip explains what happened. Notion's 2022 onboarding redesign removed all concept-explanation slides and replaced them with in-context coach marks — retention improved 23% (published Notion blog, January 2023).

**Tutti application:**

Three contextual touchpoints replace the kitchen setup screen and any in-onboarding configuration:

**Touchpoint 1 — KitchenNudge (on Home mount, first session):**
Location: Below the serve time bar, above the dishes area.
Trigger: `sessionCount === 0 && !kitchenNudgeDismissed`.
Copy: "Using a default kitchen setup. Tap to customize for accurate timing."
Action: "Customize" → KitchenScreen. "×" → dismiss.

**Touchpoint 2 — BuildPlanCoachMark (on first "Build Plan" tap):**
Location: Tooltip anchored to the "Build Plan" button, appears for 3 seconds before executing.
Trigger: `planBuildCount === 0`.
Copy: "This creates a timed parallel plan for all your dishes."
No action required — auto-dismisses. Executes Build Plan immediately after 3-second display.

**Touchpoint 3 — GanttCoachMark (on first Preview screen mount):**
Location: Tooltip anchored to the Gantt chart area.
Trigger: `previewViewCount === 0`.
Copy: "Each row is a dish. Overlapping bars mean you cook them at the same time."
Action: "Got it" dismiss button.

### Slide Content Spec

**Slide 1:**
- Headline: "Dinner, parallel-cooked."
- Subtext: "Add your dishes, set a time. Tutti tells you exactly what to do and when."
- Visual: A simple split illustration — two dishes with overlapping timer arcs. Not a screenshot. Abstract is acceptable here because this is the concept frame, not the feature reveal.
- Progress indicator: dot 1 of 3 active.

**Slide 2:**
- Headline: "Pick dishes, set a serve time."
- Subtext: "Choose anything from the library. Tutti handles the timing math."
- Visual: Cropped screenshot of the Home screen with two dishes in the plan and a serve time chip showing "7:00 PM." Not a full-screen screenshot — cropped to show the key elements without UI chrome.
- Progress indicator: dot 2 of 3 active.

**Slide 3:**
- Headline: "Cook with confidence."
- Subtext: "Clear, step-by-step timing for every dish at once."
- Visual: Full-bleed `<img src="/assets/cook-screen-preview.png">` — the actual cook screen. Fills the slide area edge-to-edge, rounded corners clipped by slide container.
- CTA: `<Button variant="primary" size="large">Start cooking</Button>`. Positioned below the image with 16px padding.
- Progress indicator: dot 3 of 3 active.

### OnboardingScreen.tsx Changes

```typescript
const SLIDES: Slide[] = [
  {
    id: 'parallel',
    headline: 'Dinner, parallel-cooked.',
    subtext: 'Add your dishes, set a time. Tutti tells you exactly what to do and when.',
    visual: { type: 'illustration', src: '/assets/onboard-parallel.svg' },
  },
  {
    id: 'plan',
    headline: 'Pick dishes, set a serve time.',
    subtext: 'Choose anything from the library. Tutti handles the timing math.',
    visual: { type: 'screenshot-crop', src: '/assets/onboard-home-crop.png' },
  },
  {
    id: 'cook',
    headline: 'Cook with confidence.',
    subtext: 'Clear, step-by-step timing for every dish at once.',
    visual: { type: 'screenshot-full', src: '/assets/cook-screen-preview.png' },
    cta: 'Start cooking',
  },
];
```

The `visual.type` field drives rendering: `'screenshot-full'` renders the image full-bleed, `'screenshot-crop'` renders with padding, `'illustration'` renders as SVG with background color.

### Coach Mark Infrastructure

New file: `apps/web/src/components/CoachMark.tsx`

```typescript
interface CoachMarkProps {
  id: string;               // unique key for localStorage persistence
  anchorRef: RefObject<HTMLElement>;
  copy: string;
  autoDismissMs?: number;   // if set, dismisses automatically after N ms
  onDismiss?: () => void;
}
```

Dismissed state stored at `localStorage.getItem('tutti.coachMarks')` as a JSON object: `{ [id]: boolean }`. A mark dismissed by the user or auto-dismissed never shows again.

Positioning: uses `getBoundingClientRect()` on `anchorRef` to compute absolute position. Rendered in a portal (`document.body`) to escape stacking contexts. Arrow direction computed from available vertical space.

## Data & Dependencies

- `public/assets/cook-screen-preview.png` — must exist; generate from a real Tutti session
- `public/assets/onboard-home-crop.png` — cropped Home screenshot
- `public/assets/onboard-parallel.svg` — abstract parallel illustration
- `apps/web/index.html` — add `<link rel="preload" as="image" href="/assets/cook-screen-preview.png">`
- `apps/web/src/components/CoachMark.tsx` — new component
- `apps/web/src/screens/OnboardingScreen.tsx` — slide content overhaul
- `apps/web/src/screens/HomeScreen.tsx` — KitchenNudge + BuildPlanCoachMark mount
- `apps/web/src/screens/PreviewScreen.tsx` — GanttCoachMark mount
- `localStorage` keys: `tutti.kitchenNudgeDismissed`, `tutti.planBuildCount`, `tutti.previewViewCount`, `tutti.coachMarks`

---

# 34 — UX Progressive Disclosure

## Overview

Progressive disclosure is the practice of revealing features only when the user is ready for them — when they have the context, motivation, and skill to use them well. For Tutti, revealing the full feature set to a first-time user (AI generation, menu import, pantry tracking, step reorder, collections, stats) creates a cognitive overload that paradoxically reduces engagement. Users who are shown fewer features early, and gain access to more features as they demonstrate commitment, show higher long-term retention because each feature unlock feels earned and relevant.

## Current State

Tutti currently has no progressive disclosure system. All features are visible from first launch:
- Studio shows New Recipe, Menu Import, Collections simultaneously.
- Browse shows all category filters and search modes.
- Home shows serve time, kitchen setup, and all planning controls.
- Cook screen shows read-aloud, step reorder, multi-timer controls, and screen-wake toggle.
- Settings exposes all preferences on first visit.

Feature surface area by screen (estimated interactive elements):
- Home: 8+ controls.
- Browse: 12+ controls.
- Studio: 6 entry points.
- Cook: 10+ controls.
- Settings: 15+ toggles and fields.

No feature gating exists. No cook-count tracking exists beyond `savedMeals.length`.

Relevant files:
- `apps/web/src/screens/StudioScreen.tsx`
- `apps/web/src/screens/BrowseScreen.tsx`
- `apps/web/src/screens/HomeScreen.tsx`
- `apps/web/src/screens/CookScreen.tsx`
- `apps/web/src/screens/SettingsScreen.tsx`
- `apps/web/src/App.tsx`

## Problem

A new user opening Tutti for the first time faces 50+ interactive elements across 5 tabs before they have understood the core loop: pick dish → build plan → cook. Every feature that is visible but not yet useful adds visual noise, decision paralysis, and increases the chance the user looks for the "basic" version rather than engaging with what is in front of them.

From a retention perspective: a feature that the user discovers at the right moment (when they have the context to value it) drives a retention spike. The same feature shown before that moment is invisible — it does not register as valuable and is not used.

## V2 Design

Three tiers of feature access driven by `cookCount`:

- **Beginner (0–3 cooks):** The core loop only. Pick, build, cook. No advanced controls.
- **Regular (4–20 cooks):** AI generation, menu import, collections, serve time customization, reorder.
- **Power (21+ cooks):** Full feature set — pantry, stats, advanced step reorder, export, all settings.

`cookCount` is derived from `savedMeals.length` (each completed cook increments the meals log). This is a reasonable proxy: a user who has completed 20+ cooks has demonstrated sustained engagement and readiness for the full feature surface.

The `FeatureGate` component is the implementation primitive: it wraps any UI element and renders it only when `cookCount ≥ threshold`. Below threshold, it renders nothing (no grayed-out state, no lock icon, no explanation — the feature simply does not exist yet).

The "no lock icon" decision is deliberate: lock icons prime users to seek workarounds or feel excluded. Features that appear only when the user is ready feel like natural growth, not gatekeeping.

## Spec

### cookCount Source

```typescript
// apps/web/src/lib/cookCount.ts
export function getCookCount(): number {
  const raw = localStorage.getItem('tutti.savedMeals');
  if (!raw) return 0;
  try {
    const meals = JSON.parse(raw) as SavedMeal[];
    return meals.length;
  } catch {
    return 0;
  }
}
```

### FeatureGate Component

```typescript
// apps/web/src/components/FeatureGate.tsx
interface FeatureGateProps {
  feature: FeatureName;
  children: ReactNode;
  fallback?: ReactNode;  // optional — renders below-threshold alternative
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const cookCount = getCookCount();
  const threshold = FEATURE_THRESHOLDS[feature];
  if (cookCount < threshold) return <>{fallback}</>;
  return <>{children}</>;
}
```

### Feature Threshold Table

```typescript
// apps/web/src/lib/featureThresholds.ts
export type FeatureName =
  | 'ai_generation'
  | 'menu_import'
  | 'collections'
  | 'serve_time_custom'
  | 'step_reorder'
  | 'pantry'
  | 'stats'
  | 'export'
  | 'advanced_settings';

export const FEATURE_THRESHOLDS: Record<FeatureName, number> = {
  serve_time_custom:  0,   // always visible — core to the product
  ai_generation:      4,
  menu_import:        4,
  collections:        4,
  step_reorder:       4,
  pantry:             21,
  stats:              21,
  export:             21,
  advanced_settings:  21,
};
```

Note: `serve_time_custom` is always available — it is too central to the core loop to gate. All other controls follow the 4/21 tiers.

### Beginner Tier (cookCount 0–3)

**Home:**
- Visible: dish list, "Browse recipes" CTA (empty state), "Build Plan" button, basic serve time chip.
- Hidden: custom serve time modal, "Shopping list" shortcut, suggestions row (shown after cook 1).

**Browse:**
- Visible: search bar, category chips (first 4 categories only), recipe cards.
- Hidden: diet filter chips, advanced search, tier filter.

**Studio:**
- Visible: "My Recipes" section only.
- Hidden: "New Recipe" form, Menu Import, Collections, AI generation. Studio tab may show a simplified view: "Your saved recipes will appear here."

**Cook:**
- Visible: NOW/NEXT/PASSIVE panels, step text, basic timer.
- Hidden: read-aloud toggle, multi-timer controls, screen-wake toggle, step reorder access point. These controls are present in the DOM but wrapped in `<FeatureGate feature="step_reorder">`.

**Settings:**
- Visible: theme toggle, units (metric/imperial), dietary preferences.
- Hidden: data export, advanced timer settings, kitchen management (shown as nudge on Home instead).

### Regular Tier (cookCount 4–20)

All Beginner features plus:

**Studio:**
- Menu Import entry point unlocked.
- "New Recipe" form unlocked. AI generation unlocked within that form.
- Collections section unlocked.

**Browse:**
- Diet filter chips visible.
- Tier filter (simple/moderate/complex) visible.

**Home:**
- Suggestions row visible ("Recently cooked", "Try something new").
- "Shopping list" shortcut visible.

**Cook:**
- Read-aloud toggle visible.
- Screen-wake toggle visible.
- Step reorder accessible from Preview screen.
- Multi-timer controls visible.

**Settings:**
- Kitchen configuration section visible (moved from first-run screen).
- Notification preferences visible (for future use).

### Power Tier (cookCount 21+)

All Regular features plus:

**Me tab (Settings section):**
- Data export (JSON + PDF).
- Advanced timer settings (countdown vs. countup, sound preferences).

**Browse:**
- Advanced search operators.

**Stats screen:**
- Visible in Me tab.
- Cook history, frequency chart, most-cooked dishes.

**Pantry:**
- Visible in Me tab.
- Ingredient inventory, "what can I cook?" filter in Browse.

### Unlock Moment Communication

When a user hits cookCount 4 (first Regular unlock), a single coach mark appears on the Studio tab icon: "New tools unlocked." Tapping Studio reveals the newly visible features. This is the only moment where the tier system is made explicit.

Coach mark ID: `studio_unlock_4`. Stored in `tutti.coachMarks`. Shows once.

No unlock announcement for Power tier — power users discover features organically by returning to screens they have not fully explored.

### Testing Considerations

For development and QA, `FeatureGate` must be bypassable:

```typescript
// In dev only: set localStorage.setItem('tutti.debugCookCount', '25')
// FeatureGate reads this override when present and process.env.NODE_ENV === 'development'
```

Unit tests for `FeatureGate`:
- Renders children when `cookCount >= threshold`.
- Renders `fallback` (or null) when `cookCount < threshold`.
- Override works in test environment.

New test file: `apps/web/src/components/FeatureGate.test.tsx`.

## Data & Dependencies

- `localStorage.getItem('tutti.savedMeals')` — source of truth for cookCount
- `apps/web/src/lib/cookCount.ts` — new file
- `apps/web/src/lib/featureThresholds.ts` — new file
- `apps/web/src/components/FeatureGate.tsx` — new component
- All gated screens: `StudioScreen.tsx`, `BrowseScreen.tsx`, `HomeScreen.tsx`, `CookScreen.tsx`, `SettingsScreen.tsx`, `PreviewScreen.tsx`
- `apps/web/src/components/CoachMark.tsx` (from doc 33) — used for unlock moment at cookCount 4
- No engine changes required — disclosure is a UI layer concern only

---

# 35 — UX Empty States Playbook

## Overview

Empty states are the screens users see before they have created any content, or after they have cleared everything. They are among the highest-leverage UI moments in any app: a user who hits an empty state without a clear next step will often close the app and not return. A user who hits an empty state with a clear CTA has a 3× higher conversion rate to their first meaningful action. This document audits every empty state in Tutti, rates each against the three-element pattern (illustration + copy + single CTA), and provides V2 rewrites for each. It also establishes the copy tone guide that governs all empty state writing.

## Current State

Tutti's empty states are scattered across screens without a consistent pattern. Some screens have no empty state handling at all — they render empty containers. Others have brief text messages without CTAs. None follow the three-element pattern consistently.

Screens with known empty state conditions:
- Home: no dishes in plan.
- Browse: search returns no results.
- Studio: no personal recipes.
- Collections: no collections created.
- Pantry: no items tracked.
- Stats: no cook history.
- Shopping: no ingredients (no plan built).
- Calendar: no meals assigned.
- Meals history: no completed cooks.

Relevant files:
- `apps/web/src/screens/HomeScreen.tsx`
- `apps/web/src/screens/BrowseScreen.tsx`
- `apps/web/src/screens/StudioScreen.tsx`
- `apps/web/src/screens/ShoppingScreen.tsx`
- `apps/web/src/screens/PantryScreen.tsx`
- `apps/web/src/screens/CalendarScreen.tsx`

## Problem

Two failure modes dominate:

**Failure mode 1 — Dead end.** The screen renders empty with no CTA. The user has nowhere to go except the back button or the tab bar. No indication of what should be here, how to add it, or why they should care.

**Failure mode 2 — Multiple CTAs.** Some screens attempt helpfulness by listing several options ("Add from Browse," "Import a menu," "Start with a suggestion"). Multiple CTAs create decision paralysis. NN/g 2022 research shows that empty states with a single CTA convert 3× better than those with multiple CTAs.

Both failures communicate the same thing to the user: the app was not designed for this moment.

## V2 Design

Every empty state in Tutti V2 follows the three-element pattern:

1. **Illustration** — a single simple SVG icon or line drawing. Not a photo. Not stock art. 16–24px icon scaled up to 48–64px, rendered in `--color-text-secondary` so it doesn't compete with the CTA.
2. **Copy** — one headline (≤8 words) + one subtext line (≤16 words). Tone governed by the copy guide below.
3. **Single CTA** — one button, `variant="primary"`. One action. Never two buttons at the same level.

The three elements always render in this vertical order with consistent spacing: illustration (48px), 16px gap, headline, 4px gap, subtext, 24px gap, CTA button.

## Spec

### Copy Tone Guide

Tutti's empty state copy follows four rules:

**Rule 1 — Friendly but efficient.** Write like a knowledgeable friend, not a brand bot. Short sentences. Active verbs. No padding words.

**Rule 2 — No "Oops!".** "Oops!" signals that something went wrong. Empty states are not errors. They are starting points or natural transitions. "Oops!" trivializes the user's situation.

**Rule 3 — No exclamation points.** Exclamation points feel performative in empty states. They read as the app being excited about the user's emptiness, which is incoherent. Exception: never.

**Rule 4 — No "Simply".** "Simply tap the button below" implies the user should have known what to do already. It is condescending. Remove "simply," "just," and "easily" from all copy.

**Copy pattern:**
- Headline: "[What should be here]." State the content in neutral terms.
- Subtext: "[Why to add it / what it does]." One benefit or one instruction — not both.
- CTA: "[Verb] [object]." Start with a verb. Name what happens.

**Examples of before/after:**

| Before | After |
|---|---|
| "Oops! No recipes yet. Simply add some from Browse!" | "No recipes here yet. Add a dish and build your first plan." / CTA: "Browse recipes" |
| "Your pantry is empty. Add ingredients to track what you have!" | "Your pantry is empty. Track ingredients to see what you can cook." / CTA: "Add ingredients" |
| "Get started by adding meals to your calendar or importing from a menu!" | "No meals planned. Assign dishes to see your week at a glance." / CTA: "Plan a day" |

### Empty State Audit and V2 Rewrites

#### Home — No Dishes in Plan

**Current:** Empty container with "Build Plan" button (disabled). No copy. No CTA for adding dishes.

**Rating:** 0/3 elements present. Fails completely — the primary CTA is disabled, which is actively confusing.

**V2:**
- Illustration: plate icon (outline, 48px).
- Headline: "What are you cooking tonight?"
- Subtext: "Add dishes and Tutti will build a parallel cooking plan."
- CTA: "Browse recipes" → navigates to Browse.

**Progressive disclosure note:** Below threshold 4, this is the only CTA. Above threshold 4, a secondary text link appears below the button: "or add from your saved recipes" (navigates to Studio). Text link does not compete with primary button.

#### Browse — No Search Results

**Current:** Unknown (likely empty container). Search may return nothing with no feedback.

**Rating:** Estimated 0–1/3.

**V2:**
- Illustration: magnifying glass with no results mark (48px).
- Headline: "No recipes match that search."
- Subtext: "Try a different name, or browse by category below."
- CTA: "Clear search" → clears input and resets results.

**Note:** Category chips remain visible below the empty state so the user has an immediate alternative path. The CTA clears the dead end; the chips provide a recovery path.

#### Browse — Category Selected, No Results (edge case)

Only possible if server catalog has a category with 0 dishes (should not happen, but must handle):

- Illustration: folder icon (48px).
- Headline: "Nothing in this category yet."
- Subtext: "More recipes are added regularly."
- CTA: "See all recipes" → clears category filter.

#### Studio — No Personal Recipes

**Current:** Likely renders headers with empty sections. No CTA.

**Rating:** 0/3.

**V2 (Beginner tier, cookCount 0–3):**
- Illustration: recipe card with plus icon (48px).
- Headline: "Your recipes will appear here."
- Subtext: "Save dishes from Browse to build your collection."
- CTA: "Browse recipes" → navigates to Browse.

**V2 (Regular+ tier, cookCount 4+):**
- Same illustration and headline.
- Subtext: "Save dishes from Browse, or import from a menu."
- CTA: "Browse recipes" (primary). Secondary text link: "Import a menu" (below, smaller).

#### Collections — No Collections

**Current:** Unknown. Likely empty container.

**V2:**
- Illustration: folder with bookmark (48px).
- Headline: "No collections yet."
- Subtext: "Group your favorite recipes for quick access."
- CTA: "Create a collection" → opens new collection flow.

**FeatureGate:** This screen only renders at cookCount ≥ 4. Empty state is only reachable if the user has deleted all collections.

#### Pantry — No Items Tracked

**Current:** Unknown.

**V2:**
- Illustration: jar/container outline (48px).
- Headline: "Your pantry is empty."
- Subtext: "Track ingredients to see what you can cook with what you have."
- CTA: "Add ingredients" → opens pantry add flow.

**FeatureGate:** Only visible at cookCount ≥ 21.

#### Stats — No Cook History

This empty state is theoretically unreachable at cookCount ≥ 21 (the threshold for Stats visibility). But handle it defensively in case of data loss:

**V2:**
- Illustration: bar chart (empty bars, 48px).
- Headline: "No cook history yet."
- Subtext: "Your stats will appear after your first cook."
- CTA: "Go to Cook tab" → navigates to Home.

#### Shopping — No Plan Built

**Current:** Likely renders an empty ingredient list.

**V2:**
- Illustration: shopping bag outline (48px).
- Headline: "No ingredients yet."
- Subtext: "Build a plan first and your ingredient list will appear here."
- CTA: "Build a plan" → navigates to Home.

#### Calendar — No Meals Assigned

**Current:** Unknown.

**V2:**
- Illustration: calendar with empty slots (48px).
- Headline: "No meals planned this week."
- Subtext: "Assign dishes to each day to plan ahead."
- CTA: "Plan a day" → focuses Monday slot in calendar grid.

#### Meals History — No Completed Cooks

**Current:** Unknown.

**V2:**
- Illustration: checkmark in circle (48px).
- Headline: "No cooks recorded yet."
- Subtext: "Completed cooks will appear here."
- CTA: "Cook something" → navigates to Home.

### EmptyState Component

All empty states use a single shared component to enforce consistency:

```typescript
// apps/web/src/components/EmptyState.tsx
interface EmptyStateProps {
  icon: ReactNode;        // SVG icon, rendered at 48px
  headline: string;
  subtext: string;
  cta: {
    label: string;
    onClick: () => void;
  };
  secondaryCta?: {        // optional secondary text link (Regular+ only)
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, headline, subtext, cta, secondaryCta }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-headline">{headline}</p>
      <p className="empty-state-subtext">{subtext}</p>
      <Button variant="primary" onClick={cta.onClick}>{cta.label}</Button>
      {secondaryCta && (
        <button className="empty-state-secondary" onClick={secondaryCta.onClick}>
          {secondaryCta.label}
        </button>
      )}
    </div>
  );
}
```

CSS:

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
  gap: 0;
}
.empty-state-icon {
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}
.empty-state-headline {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}
.empty-state-subtext {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0 0 24px;
  max-width: 260px;
}
.empty-state-secondary {
  margin-top: 12px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  text-decoration: underline;
  cursor: pointer;
}
```

### Icon Library

All empty state icons must come from a single icon set to ensure visual consistency. V2 uses a subset of Lucide icons (already a common choice in React + Vite projects) at `strokeWidth={1.5}` and `size={48}`:

| Screen | Icon |
|---|---|
| Home | `UtensilsCrossed` |
| Browse (no results) | `SearchX` |
| Browse (empty category) | `FolderOpen` |
| Studio | `BookOpen` |
| Collections | `Bookmark` |
| Pantry | `Package` |
| Stats | `BarChart2` |
| Shopping | `ShoppingBag` |
| Calendar | `CalendarDays` |
| Meals history | `CheckCircle` |

### Copy Review Checklist

Before shipping any empty state copy, verify against this list:

- [ ] No "Oops" or "Uh oh."
- [ ] No exclamation points.
- [ ] No "simply," "just," "easily."
- [ ] Headline is ≤ 8 words.
- [ ] Subtext is ≤ 16 words.
- [ ] CTA starts with a verb.
- [ ] Only one primary CTA button.

## Data & Dependencies

- `apps/web/src/components/EmptyState.tsx` — new shared component
- `lucide-react` — already installed or add to `package.json`
- All screen files listed in Current State section — replace ad-hoc empty UI with `<EmptyState>` component
- `apps/web/src/components/FeatureGate.tsx` (from doc 34) — wraps secondary CTAs on Studio empty state
- `getCookCount()` from `apps/web/src/lib/cookCount.ts` (from doc 34) — used in Studio empty state to choose single vs. dual CTA
- CSS custom properties `--color-text-primary`, `--color-text-secondary`, `--text-lg`, `--text-sm` must exist in the global theme (verify against `apps/web/src/styles/`)
