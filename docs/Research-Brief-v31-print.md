# Research Brief v31 — Print (shopping list & recipe)

*Status: active · continuous-enhancement · pairs with share/export (Brief v16) · authored by the loop*

## Rationale — why this, now

Sometimes paper wins: you want the **shopping list on a slip in your pocket** at the store, or a
**recipe taped to the cabinet** while your hands are messy and the phone's across the kitchen. Tutti
can already share/copy (Brief v16), but printing the current screen produces a mess — the whole app
chrome (header, nav links, toggles, steppers, footer) prints along with the content. A small **print
stylesheet** that strips the UI and lays the content out cleanly in black-on-white, plus a "Print"
affordance on the shopping list and recipe detail, turns Tutti into something you can also use on
paper. It's the single most requested print use case in the research ("a recipe to follow while
cooking, a list to take shopping"), it's pure CSS + a one-line `window.print()`, and it adds no deps
or bundle risk.

### Research findings folded in (web pass, June 2026)

- Use `@media print { … display: none !important }` to hide non-content chrome (header, footer, nav,
  buttons, toggles); a **whitelist-ish** approach (hide the app shell, keep the active screen) is
  cleanest. Set `@page` margins; force legible black-on-white; serif is fine for print.
- Provide a clear **"Print" button** that calls `window.print()`; the button itself should be hidden
  in the printed output. Internal anchors don't need printed URLs.

## Definition of done

Printing (Ctrl/Cmd-P or a "Print" button) the shopping list or a recipe yields a clean black-on-white
sheet with just the content (ingredients/steps/list) — no header, footer, nav links, steppers,
toggles, skip link, install button, or the Print button itself; `@page` margins are sane; nothing
breaks on screen; gate green (incl. perf — CSS only, no deps).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Print stylesheet (CSS).** Add an `@media print { … }` block to `theme.css`: `@page { margin:
   14mm }`; `body { background: #fff; color: #000 }`; hide the app chrome — `header, footer,
   .skip-link, .home-links, .subtabs, .kp-stepper, .kp-toggle, .staple-toggle, .browse-info, .mic,
   .scale-btn, .add-dish, .btn, .link, .sr-only { display: none !important }` — but KEEP content
   (`.zone`, `.ing-sec`, `.ing-row`, `.recipe-steps`, `.recipe-step`, headings, `.nm`, `.amt`,
   `.sub-hint`). Ensure ingredient/step text prints in black; remove card backgrounds/shadows.
   A `.no-print` utility class for anything else to suppress, and `.print-only` shown only in print.
2. **Print buttons.** Add a small "🖨 Print" button (class `btn ghost no-print`) to `ShoppingScreen`
   and `RecipeDetailScreen` that calls `() => window.print()` (guard `typeof window`). Hidden in the
   printed output (it's chrome). Keep it subtle near Back/Share.
3. **Legibility.** In print, make checkboxes/dots render as visible marks (e.g. show the box as an
   outline + a "✓" for checked items so a printed shopping list is usable); ensure the dish color
   dots still show (or swap to text labels) — keep minimal; the list text is the priority.
4. **Honest + non-breaking.** Screen view unchanged; print only affects the print media. Don't
   over-engineer page breaks; just avoid splitting a row mid-line if cheap (`break-inside: avoid` on
   rows/steps).
5. **Tests.** A small test that ShoppingScreen and RecipeDetail render a "Print" button that calls
   `window.print` (mock `window.print` with a spy). (The print CSS itself isn't unit-testable in
   jsdom — note that; the button wiring is.)

## Enforce-what-you-build
- a test that the Print button calls `window.print()` on Shopping + RecipeDetail.
- print CSS is additive/media-scoped; gate (incl. perf-check — no deps) stays green.

## When substantially done
Run a web-research pass on the next gap (photos, onboarding, temperature, or competitor feature) and
**author `docs/Research-Brief-v32-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Printing
- https://css-tricks.com/print-stylesheet-approaches-blacklist-vs-whitelist/
- https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/
