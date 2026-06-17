# Research Brief v2 — Single-Recipe Progressive UI (Phase 2)

*Status: active · Phase 2 of the roadmap (Doc 3 §4) · authored by the unattended loop after Phase 1*

## Rationale — why this, now

Phase 1 is complete: the engine is a proven, pure, deterministic scheduler (67 tests, all six
invariants property-checked) and the web app already renders real `compile() → deriveViewState()`
output with working tap-to-Done auto-promotion. What's missing is the **experience around the
cook view**: a first-run flow, a kitchen profile the allocator can actually read from the UI, a
way to choose a dish and a serve time, a confidence-building plan preview, and a cook view
polished enough to use one-handed at the stove. Phase 2's metric (Doc 3 §4): *a cook makes one
dish start-to-finish without scrolling or getting lost.*

We build the **full flow for a single recipe** now (multi-dish merge is Phase 3 / Brief v4, but
the engine already supports N recipes, so the UI is built multi-ready and simply defaults to one).

### Research findings folded in (web pass, June 2026)

- **Closest competitors set the bar we must beat.** *Time To Plate* already does backward-planned
  timelines + "appliance-lane" scheduling + fixed serve time; *MultiCook Timer+* does auto start
  times and resting reminders. **Tutti's differentiator is the deterministic hands-as-resource
  interleaving engine** (none of them model the cook's hands as a constraint, so none truly hide
  active work inside passive windows). Phase 2 must make that visible — the plan preview should
  *show* chopping nested inside a simmer, and the value delta ("91→45") must be front and center.
- **Cook-mode UX (consensus across ATK, Tubik, SideChef, eathealthy365):** big bold one-action-
  at-a-time layout; a single large Next/Done target; group hands-free affordances under one
  control; mobile-first (people cook on the phone, screen across the counter); step photos/short
  clips beat paragraphs; keep the screen awake; integrate measurements/shopping so users never
  scroll back. These directly reinforce Doc 7 — implement them concretely.
- **Accessibility / glanceability:** large type + high contrast by default, big touch targets,
  one-handed reach, screen-reader parity (ViewState maps to a labelled list). Build these in from
  the first screen, not as a retrofit.

**Boundary reminder:** the cook path stays LLM-free and offline (P2/P4). All UI logic asks the
engine; the client stays "dumb" (Doc 1 §5.3).

## Definition of done (phase metric, Doc 3 §4)

A test user cooks one real recipe through the app: never opens a separate ingredients list, never
scrolls to find the current step, finishes successfully — verified in-browser via Playwright MCP.

## Items — small, ordered, independently testable (keep the gate green after each)

1. **App shell + routing/state.** A lightweight screen state machine (no heavy router): `onboarding
   → kitchen → home → pick → serveTime → preview → cook → done`. Persist current screen + session in
   `localStorage`. Keep `deriveViewState` as the single source for the cook screen.
2. **Kitchen Profile screen (Doc 7 §3).** Editable Level-0 counts (cooks, burners, oven, pressure
   cooker, microwave, blender, cutting boards, counter size) with +/- steppers and on/off toggles.
   Persist to `localStorage`; feed it straight into `compile()`'s `kitchenProfile`. Sensible
   defaults (1 cook, 2 burners) so a user can skip and cook immediately.
3. **Onboarding (first-run only, Doc 7 §2).** Three swipeable value cards → "Set up my kitchen".
   Skippable; shown once (flag in `localStorage`).
4. **Pick dishes + serve time (Doc 7 §5–6).** Single-select from the library (thali recipes for
   now) with the live "X min separately → Y min with Tutti" delta computed from `compile()`; serve-
   time picker feeding the reverse anchoring; honest infeasible-deadline message (engine already
   returns it).
5. **Plan preview (Doc 7 §7) — the differentiator made visible.** A simple timeline/Gantt from
   `plan.schedule` (per-node planned start/end bars) that visually nests active tasks inside passive
   windows, with the start time and "all ready at HH:MM". This is where we out-show Time To Plate.
6. **Polished three-tier Cook view (Doc 7 §8).** Refine the existing NOW/NEXT/DONE: big NOW card,
   one large Done target spanning the card, passive tasks shown as ambient live countdowns (not a
   to-do), `nextStartAlert` surfaced, serve clock turns amber when `runningLate`. Keep-awake via
   the Screen Wake Lock API. Undo from the archive (long-press → applyEvent undo).
7. **Local session persistence (Doc 1 P4).** Persist the in-progress plan so backgrounding/reload
   resumes mid-cook (the stove is on). Restore on load.
8. **Guided-not-gated phase transition (Doc 7 §9, Master §7.2).** Beginner nudge ("prep's basically
   done — start cooking?") with a one-tap confirm; a Pro-mode toggle skips it entirely. Never a wall.
9. **Accessibility & kitchen-readability pass.** Large type/high-contrast defaults, ≥44px targets,
   ARIA labels on all controls, the three-tier view as a screen-reader-navigable labelled list,
   reduced-motion support. Add a structural/a11y gate assertion (headings + labelled Done control).

## Enforce-what-you-build (gate additions)

- A DOM/Playwright assertion that the cook screen's NOW zone equals `deriveViewState(plan).active`.
- A persisted-session smoke (reload keeps progress).
- The a11y structural check from item 9 becomes a permanent gate assertion.

## When substantially done

Run the Phase-2 web-research pass (mobile gesture/scroll ergonomics, timeline/Gantt visualizations
for non-experts, onboarding conversion patterns, Screen Wake Lock support, voice-cooking pitfalls),
then **author `docs/Research-Brief-v3-recipe-ingestion.md`** inline (Phase: pull Track C forward —
Add dish → Paste / Find online / Ask AI, the `RecipeParser` + `validate()` repair loop, AiParser
behind the `.env` key, the "unverified" badge). Lead with rationale. The loop never ends.

## Sources (research pass)
- https://openforge.io/cooking-application/
- https://blog.tubikstudio.com/case-study-recipes-app-ux-design/
- https://www.sidechef.com/business/recipe-platform/ux-best-practices-for-recipe-sites
- https://eathealthy365.com/the-ultimate-guide-to-smart-recipe-cook-mode/
- https://my.timetoplate.com/blog/best-meal-planning-apps
- https://apps.apple.com/ph/app/multicook-timer/id6759484693
