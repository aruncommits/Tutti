# Research Brief v28 — Accessibility & Performance Re-Audit

*Status: active · continuous-enhancement / quality · re-checks Brief v9 across new surfaces · authored by the loop*

## Rationale — why this, now

Brief v9 took Lighthouse accessibility to 100 — but that was ~18 briefs and **eight-plus new screens
ago**: Browse (with the ⓘ details affordance + staple toggles), Recipe detail, Mise/"Get ready",
Settings, Stats, Meals, the suggestion card, install button, and several steppers/inputs. New UI is
exactly where a11y and perf regressions creep in (an unlabeled input, a faint helper line below the
contrast floor, a heading that skips a level, a growing entry bundle). The honest move before piling
on more features is to **re-audit the whole app and fix what regressed** — quality the gate can't see
on its own. This is verifiable with the Chrome DevTools MCP (axe/Lighthouse) and keeps Tutti's "100"
real, not a one-time number.

### Research findings folded in (web pass, June 2026)

- Audit to **WCAG 2.2 AA**. The most common failures: **unlabeled form fields** (placeholders are NOT
  labels), **insufficient contrast** (4.5:1 text, **3:1 for UI components/icons/input borders**),
  missing/!skipped heading levels, and broken keyboard nav.
- **INP is the Core Web Vital to watch** (<200ms): keep interactions cheap; our handlers are tiny and
  local, so the risk is bundle/parse, which the entry budget already guards.
- Performance budgets prevent slow erosion — we have `perf-check` (entry <190KB); confirm it still
  holds and the chunking is sane.

## Definition of done

A fresh Lighthouse run (mobile) across the key screens reports **Accessibility 100 / Best Practices
≥95**, with any axe critical/serious violations on the new screens fixed (labels, contrast, headings,
keyboard); the perf entry budget still holds; a couple of structural a11y assertions are added for
the new screens so future regressions are caught by the gate.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Audit sweep (Chrome DevTools MCP).** Navigate the running app to: home, browse, recipe (via ⓘ),
   ready (mise), settings, stats, meals, pick, cook. Run `lighthouse_audit` (mobile) on home + a
   couple of the heaviest screens; collect the failing audits. Record the concrete violations (don't
   guess) — likely candidates: a low-contrast `--faint`/`.dur`/`.sub-hint` line, an input/select
   without a label, a heading-order skip (h2→h3 fine; h3 without a preceding h2 not), an icon-only
   button missing an accessible name.
2. **Fix a11y violations.** Address each critical/serious finding minimally: add `aria-label`/visible
   label where missing; bump any sub-4.5:1 text colour (or 3:1 for UI) — adjust the CSS token, not
   ad-hoc per element; fix heading levels; ensure icon-only buttons (🏠 staple, ⓘ details, mic, +/−
   steppers) have names (most already do — verify). Re-run the audit to confirm 100.
3. **Confirm perf.** Re-run Lighthouse (or rely on perf-check) — entry chunk under budget, multiple
   chunks; note the a11y/best-practices/perf scores in the commit. Trim only if something regressed.
4. **Lock with tests.** Add a few structural a11y assertions for the newest screens (e.g. each of
   RecipeDetail/Mise/Settings exposes an `h2`; the icon-only buttons have accessible names) so a
   future regression trips the gate, not just a manual audit.
5. **Honest report.** The commit states the measured scores and exactly what was fixed; if a finding
   is a false positive or out of scope (e.g. third-party), say so rather than silently skipping.

## Enforce-what-you-build
- structural a11y tests for the new screens (headings + named icon buttons) in the gate.
- perf-check (entry budget + split) stays green; scores recorded in the commit.

## When substantially done
Run a web-research pass on the next gap (photos, units toggle, onboarding, or another competitor
feature) and **author `docs/Research-Brief-v29-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://webaim.org/standards/wcag/checklist
- https://webaim.org/articles/contrast/
- https://www.corewebvitals.io/core-web-vitals
