# Research Brief v11 — Motion Polish (Queue→NOW, transitions)

*Status: active · continuous-enhancement · realizes Doc 7 §13 (motion for Queue→NOW promotion) · authored by the loop*

## Rationale — why this, now

Doc 7 §13 explicitly lists, under "what design needs next," **motion design for the Queue→NOW
promotion — "it should feel instant and obvious."** Right now, when the cook taps Done, the next
task *snaps* into the NOW zone with no transition — functional but jarring, and easy to miss in a
busy kitchen where the cook glances at the phone for a half-second. A small, tasteful motion pass
makes the single most important moment of the cook flow (a task promoting) legible and satisfying,
and gives screen changes a gentle continuity. This is bounded, dependency-free (CSS only), and the
app already has the `prefers-reduced-motion` hook to make it fully accessible.

### Research findings folded in (web pass, June 2026)

- **CSS is enough** for the cases that matter: an **enter animation** (fade + slide-up) when a card
  first appears, plus a brief **highlight pulse** on a just-promoted task. True list-reorder FLIP
  needs JS, but Tutti's NOW set mostly *appends* on promotion, so a CSS enter animation reads as the
  promotion — no library, no bundle cost (keeps the v10 budget).
- **`prefers-reduced-motion` is mandatory:** disable transform/translate animations under reduced
  motion, keeping at most opacity. The app already has a reduce block — extend it to cover the new
  animations so they fully no-op.
- Keep durations short (~150–250ms) and easing gentle (the existing `--ease`); motion should clarify,
  not entertain. Never animate the serve clock or block interaction.

## Definition of done

NOW cards animate in (fade + subtle rise) when they appear; a newly-promoted task gets a brief
highlight; screen changes have a gentle fade; **all of it is disabled under `prefers-reduced-motion`**;
no new dependencies; the perf budget + gate stay green. Verified in-browser (and that reduced-motion
removes it).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **NOW card enter animation (CSS).** A keyframe (`@keyframes rise { from { opacity:0;
   transform: translateY(8px) } to { opacity:1; transform:none } }`) applied to `.now-card` with
   ~180ms `var(--ease)`. Because React reuses DOM on re-render, key the animation so it plays when a
   card *appears* — simplest robust approach: apply the animation to `.now-card` generally (it
   replays when the element mounts; promotion mounts a new card). Verify it doesn't replay on every
   countdown tick (the passive card re-renders each second) — if it does, scope the animation to a
   modifier class set only for non-passive/just-entered cards, or use `animation` only on
   `.now-card:first-child` / a CSS `@starting-style` for entry.
2. **Promotion highlight.** A brief background/border flash on the active card when it becomes the
   focus (e.g. an `outline`/box-shadow pulse ~600ms once). Keep it subtle and one-shot.
3. **Screen-change fade.** A light fade/opacity transition on `#screen-main` content when `screen`
   changes (CSS `@keyframes fade` applied via a key on the main element keyed by `screen`).
4. **Reduced-motion gate.** Extend the existing `@media (prefers-reduced-motion: reduce)` block to
   set `animation: none !important` on all the above. Confirm by toggling emulation.
5. **Verify + (light) test.** In-browser: tap Done and see the next task rise in; toggle reduced
   motion and confirm it's static. Add/extend a CSS-presence or structural assertion if practical
   (e.g. the keyframes exist / the reduce block nullifies them) — or rely on visual verification +
   the existing gate.

## Enforce-what-you-build
- the `prefers-reduced-motion` block nullifies the new animations (keep the existing reduced-motion
  rule comprehensive); gate stays green (no deps, budget intact).

## When substantially done
Run a web-research pass on the next gap (saved meals / favorites for re-cooking, or a deeper
competitor-parity feature) and **author `docs/Research-Brief-v12-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://www.joshwcomeau.com/react/animating-the-unanimatable/
- https://www.joshwcomeau.com/react/prefers-reduced-motion/
- https://motion.dev/docs/react-accessibility
