# Research Brief v18 — "What should I cook?" (smart suggestion)

*Status: active · continuous-enhancement · uses v6 pace + v12 meals + v17 ratings · authored by the loop*

## Rationale — why this, now

Tutti now quietly knows a lot about you, all on-device: which meals you've **saved**, what you've
**recently cooked**, how you **rated** dishes, and how many times you've made them. The highest-
leverage thing to do with that is answer the question everyone actually asks at 6pm: **"what should I
cook tonight?"** A single tap that proposes a meal you'll like, haven't made in a while, and can
finish in time — with an honest one-line reason — turns Tutti's accumulated memory into a daily
payoff and removes the blank-page moment. It's pure ranking logic over data we already persist (no
LLM, no network), and it directly extends v6 (pace), v12 (saved/recents), and v17 (ratings).

### Research findings folded in (web pass, June 2026)

- Modern planners personalize on **rating history** and **time/availability**, and the leaders frame
  themselves as a "teammate" that already knows your tastes.
- **Avoiding repetition is the consistently cited weakness** — algorithms "lean on the same dishes
  by week 3–4." So the ranking must actively **penalize recently-cooked** meals (a recency term),
  not just sort by rating. Variety is a feature, not an afterthought.
- Keep it transparent: show *why* it was suggested ("you loved it, and it's been a while") — honest
  recommendations build trust far better than a black box.

## Definition of done

A Home affordance proposes a meal (from the user's saved + recent meals, ranked by rating + variety
+ time-fit) with a plain-language reason and a one-tap "Cook this" that restores it into the flow;
graceful fallback when there's no history (suggest a well-rated library/starter meal); the ranking is
pure, deterministic (clock passed in), and unit-tested; gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure ranking (web).** `apps/web/src/suggest.ts`: `suggestMeal(meals: SavedMeal[], notes: NotesMap,
   opts: { nowMs: number }): { meal: SavedMeal; reason: string } | null`. Score each candidate meal:
   **rating term** (avg of its dishes' ratings, default-neutral when unrated) **+ variety term**
   (more days since `savedAt`/lastCooked → higher, so just-cooked meals are demoted) — combine with
   clear weights. Pick the max; build a `reason` from the dominant factor ("You rated this highly" /
   "You haven't made this in a while" / "A favorite worth repeating"). Deterministic: all time math
   from `opts.nowMs`. Return null when `meals` is empty. Pure helper `daysSince(ms, nowMs)`.
2. **Home suggestion card (web).** A "Tonight?" / "What should I cook?" affordance on Home that, when
   there are saved/recent meals, shows the suggested meal name + reason + a "Cook this" button →
   `restoreMeal(meal)` (existing). Subtle; collapses when no suggestion.
3. **Graceful fallback.** When the user has no saved/recent meals yet, suggest a sensible starter
   (e.g. the seeded thali, or the highest-rated library dish if any rating exists) with an honest
   reason ("A great first meal to try"). Never fabricate a rating.
4. **Honest + transparent.** The reason must reflect the real reason it ranked first; if everything
   is unrated and equally old, say so plainly ("Something different tonight"). No fake confidence.
5. **Tests.** `suggest.test.ts`: a highly-rated older meal beats a low-rated recent one; a just-
   cooked meal is demoted vs an equally-rated older one (variety); empty list → null; reason matches
   the dominant factor. A light Home test that the suggestion card renders and "Cook this" restores.

## Enforce-what-you-build
- ranking is pure + deterministic; rating-vs-variety trade-offs and empty/fallback cases unit-tested.
- the shown reason is derived from the actual top factor (no hardcoded copy that can lie).

## When substantially done
Run a web-research pass on the next gap (photos, nutrition/cost, richer onboarding, or another
competitor feature) and **author `docs/Research-Brief-v19-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://ollie.ai/2025/10/21/best-meal-planning-apps-in-2025/
- https://blog.eatthismuch.com/best-meal-planning-apps/
- https://www.savortheapp.com/blog/food-tracking-apps/food-review-app/
