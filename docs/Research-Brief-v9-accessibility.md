# Research Brief v9 — Accessibility Deepening (focus, keyboard, announce)

*Status: active · continuous-enhancement · realizes Doc 7 §12 (VoiceOver/TalkBack parity, keyboard) · authored by the loop*

## Rationale — why this, now

Tutti has good *baseline* a11y — semantic regions, ARIA labels, big targets, a structural a11y
gate test — but it's a **single-page app with a screen state machine**, and SPAs have a well-known
a11y hole: when the "screen" changes there is **no page load**, so screen-reader users aren't told
anything and keyboard focus is stranded on the link they just clicked. A cook using VoiceOver or
keyboard (hands messy, or with a disability) currently gets a silent, disorienting transition every
time they move between Home → Browse → Pick → Cook. Closing this is the highest-value a11y work and
directly serves Doc 7 §12's promise of screen-reader parity. It's also bounded and testable.

### Research findings folded in (web pass, June 2026)

- **The dual fix for SPA route changes:** on screen change, **(a) move focus to the new screen's
  heading** and **(b) announce the change via an `aria-live="polite"` region** — both, because some
  AT/browser pairs don't reliably announce a programmatically focused element. This is the single
  most impactful change.
- **Never kill the focus outline.** Provide a clear `:focus-visible` indicator with ≥3:1 contrast;
  don't rely on color alone. Custom toggle controls should be real `<button>`s (they already are →
  Enter/Space work for free).
- **Audit with axe/Lighthouse** in the rendered app; fix concrete violations (labels, contrast,
  roles) rather than guessing.

## Definition of done

Changing screens moves keyboard focus to the new screen's heading and announces it to screen
readers; all interactive elements show a clear focus ring; an automated a11y audit (axe via the
Chrome DevTools MCP, or a jsdom-level check) passes with no critical violations; the existing a11y
gate is extended. Verified in-browser.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Each screen is a focusable, labelled landmark with a heading.** Audit: every screen's root
   `<section aria-label=...>` already exists; ensure each has a visible `<h2>` (most do — Home and a
   couple of stubs may not). Give the screen container `tabIndex={-1}` and a stable ref/id so focus
   can land on it.
2. **Focus + announce on screen change (App).** In App, a `useEffect([screen])` that (a) focuses the
   current screen's heading/region (a ref updated per render) and (b) writes the screen's human name
   into a visually-hidden `aria-live="polite"` status node ("Now on Browse recipes"). Add an
   `.sr-only` utility class. Don't steal focus on first mount mid-typing — guard for the onboarding
   path.
3. **Visible focus ring.** Add a global `:focus-visible` outline (2px, ≥3:1 against backgrounds)
   for buttons, links, inputs, and the chip/toggle controls; verify the CSS reset didn't suppress
   outlines. Respect `prefers-reduced-motion` (already present) and don't remove outlines.
4. **Skip-to-content + landmark check.** A "Skip to content" link as the first focusable element
   that jumps to the active screen region; ensure one `main`/region per view.
5. **Automated audit + tests.** Run an axe/Lighthouse a11y pass via the Chrome DevTools MCP against
   the running app and fix any critical/serious violations. Add a jsdom test: each major screen
   exposes a heading and the live-region/skip-link exist; extend the gate's a11y assertions.

## Enforce-what-you-build
- a test asserting the `aria-live` status region + skip link render, and key screens have an `h2`.
- (manual/MCP) axe audit shows zero critical violations on Home/Browse/Pick/Cook.

## When substantially done
Run a web-research pass on the next gap (Lighthouse **performance** budget / bundle size & code-
splitting, or motion polish for the Queue→NOW promotion, Doc 7 §13) and **author
`docs/Research-Brief-v10-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://www.accesify.io/blog/accessibility-single-page-apps-react/
- https://nolanlawson.com/2019/11/05/what-ive-learned-about-accessibility-in-spas/
- https://daverupert.com/2019/01/accessible-page-navigations-in-single-page-apps/
- https://a11y-guidelines.orange.com/en/articles/single-page-app/
