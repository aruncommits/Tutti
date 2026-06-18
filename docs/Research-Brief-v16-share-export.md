# Research Brief v16 — Share / Export (shopping list & plan)

*Status: active · continuous-enhancement · competitor parity (Doc 9) + Doc 7 flow · authored by the loop*

## Rationale — why this, now

Tutti builds a consolidated, de-duplicated shopping list for a multi-dish meal — genuinely useful —
but it's trapped in the app. The real-world workflows are: **send the list to whoever's going to the
store**, or **take it with you**. Every shopping/meal app supports share/export; without it the
list can't leave the screen. The user's core scenario (cooking for occasions, multiple dishes) is
exactly when someone else shops or you split the run. A **"Share list"** action — native share sheet
where supported, clipboard copy everywhere else — closes that loop with no backend, no accounts, and
fits the local-first boundary. It's small, high-utility, and a natural follow-on to the shopping and
saved-meals work.

### Research findings folded in (web pass, June 2026)

- **`navigator.share({ title, text })`** opens the OS share sheet (messages, email, etc.); it must be
  called from a **user gesture** (transient activation) and rejects with `AbortError` if the user
  cancels — handle that quietly (not an error).
- **Always provide a clipboard fallback** (`navigator.clipboard.writeText`) for browsers/desktops
  without Web Share — copy the text and confirm with a tiny "Copied!" toast. Feature-detect both;
  never assume either exists (the gate runs under jsdom).
- The API deliberately hides which target the user picked (anti-fingerprinting) — so just fire and
  forget; show success generically.

## Definition of done

From the shopping list, the user can share it (native sheet) or copy it to the clipboard as clean
text; the plan (serve time + dishes + start time) can likewise be shared from Preview; both are
gesture-triggered, feature-detected, and degrade gracefully; gate green (incl. perf/pwa/a11y), no
new deps.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure formatters + share helper (web).** `apps/web/src/share.ts`:
   `formatShoppingList(items): string` (plain-text "• 2 cup rice" lines under a "Tutti — shopping
   list" header) and `formatPlan(plan, dishNames): string` ("Serving at 19:30 · start 18:39 · Rice,
   Vatha Kuzhambu, Beans Poriyal"). Plus `shareOrCopy(title, text): Promise<"shared"|"copied"|"failed">`
   — uses `navigator.share` when available (treat `AbortError` as a quiet non-failure → return
   "shared"), else `navigator.clipboard?.writeText` → "copied", else "failed". Fully feature-detected
   (safe under jsdom). Keep formatters PURE (deterministic, unit-testable).
2. **Share from the shopping list (web).** A "Share list" / "Copy" button on `ShoppingScreen` that
   builds the text from the items it already renders and calls `shareOrCopy`; on "copied" show a brief
   inline "Copied!" confirmation (aria-live). Gesture-triggered.
3. **Share the plan (web).** A small "Share plan" action on `PreviewScreen` (or alongside Save this
   meal) using `formatPlan`. Keep it subtle.
4. **Graceful + honest.** No share target / denied clipboard → the button still gives feedback
   ("Couldn't copy") rather than failing silently; never block. Don't claim success that didn't happen.
5. **Tests.** `share.test.ts`: `formatShoppingList`/`formatPlan` produce expected text;
   `shareOrCopy` returns "shared" when `navigator.share` resolves (and on `AbortError`), "copied" when
   only `clipboard.writeText` exists, "failed" when neither — using mocked navigator members, cleaned
   up after. A light ShoppingScreen test that the Share button is present and calls the helper.

## Enforce-what-you-build
- formatters are pure and unit-tested; `shareOrCopy` branch selection (share / clipboard / none) is
  unit-tested with mocks — the gate needs no real share/clipboard implementation.

## When substantially done
Run a web-research pass on the next gap (nutrition/cost rollups, richer kitchen/equipment modelling,
or another competitor feature) and **author `docs/Research-Brief-v17-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API
- https://blog.logrocket.com/advanced-guide-web-share-api-navigator-share/
