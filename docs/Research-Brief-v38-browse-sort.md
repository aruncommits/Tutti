# Research Brief v38 — Sort the Library (quickest / top-rated / most-cooked)

*Status: active · continuous-enhancement · builds on Brief v8 (browse) + v17 (ratings) + v37 (bigger library) · authored by the loop*

## Rationale — why this, now

The library just doubled to 11 dishes (Brief v37), and Browse already filters (max-time, veg,
allergens) — but it only ever shows them in one fixed order. With a real list, the question shifts
from "which match" to "which first": the **quickest** thing tonight, my **top-rated** dishes, the
ones I **cook most**. Sorting is the soft-ordering complement to filtering (which excludes), and it's
the natural payoff for the ratings/cook-counts captured in v17 — surfacing favorites without hiding
anything. It's a small, pure ranking over data already on screen, and it makes the growing library
genuinely navigable.

### Research findings folded in (web pass, June 2026)

- **Sort ≠ filter**: sorting *reorders* (soft), filtering *excludes* (hard) — keep both, don't conflate.
  Offer the meaningful keys: **time**, **rating**, **popularity** (cook-count). **Avoid alphabetical
  as the default** — it's rarely the most useful.
- Put the sort control **at the top, clearly labelled** (not a bare icon), and **show the active
  choice** so the ordering is legible.

## Definition of done

Browse has a labelled sort control with **Default · Quickest · Top rated · Most cooked**; choosing one
reorders the (already-filtered) list accordingly, the active choice is visible, and it composes with
the existing filters; the ranking is pure + unit-tested; gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure sort (web).** In `apps/web/src/libraryView.ts` add `type SortKey = "default" | "quickest" |
   "rated" | "cooked"` and `sortLibrary(entries: LibraryEntry[], key: SortKey, notes: NotesMap):
   LibraryEntry[]` — a **stable** copy: `quickest` = `totalMins` ascending; `rated` = by
   `notes[id]?.rating ?? 0` descending (unrated sink); `cooked` = by `notes[id]?.cookCount ?? 0`
   descending; `default` = original order (return a copy unchanged). Tie-break by original index so
   it's deterministic. Unit-test each key (quickest orders by time; rated/cooked put the high one
   first; default is unchanged; stable).
2. **Sort control in Browse.** A labelled "Sort" row at the top of `BrowseScreen` (above or beside the
   filters) with chips Default/Quickest/Top rated/Most cooked (reuse `chip-toggle`, aria-pressed); a
   `useState<SortKey>("default")`. Apply `sortLibrary(filterLibrary(ENTRIES, …), sort, notes)` so sort
   runs *after* filtering. Show the active chip; keep ≥40px targets.
3. **Compose, don't conflate.** Filters still exclude; sort only reorders what's left. The count stays
   the filtered count.
4. **Honest.** Unrated/never-cooked dishes sort to the bottom for rated/cooked (no fabricated scores);
   "Default" is the curated order.
5. **Tests.** `sortLibrary` unit tests (item 1). A Browse test that switching to "Quickest" puts the
   shortest-time dish first (assert order of the rendered rows), and that the filtered count is
   unchanged by sorting.

## Enforce-what-you-build
- `sortLibrary` pure + unit-tested (each key + stability + default-unchanged).
- a Browse test that sorting reorders but doesn't change the result count.

## When substantially done
Run a web-research pass on the next gap (onboarding polish, a second cuisine, or another competitor
feature) and **author `docs/Research-Brief-v39-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://climbtheladder.com/10-sorting-ux-best-practices/
- https://blog.cds.co.uk/optimising-user-experience-with-best-practice-filtering-and-sorting
- https://uxcel.com/lessons/filter--sort-best-practices-369
