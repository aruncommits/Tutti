# Research Brief v37 — Expand the Golden Library

*Status: active · continuous-enhancement · Doc 8/9 (seed the vertical deeper) · authored by the loop*

## Rationale — why this, now

Tutti ships a seeded library of 6 verified vegetarian South Indian recipes (Brief v8). It's enough to
demo, but a real cook wants enough out-of-the-box dishes to actually *compose a meal* without pasting
anything — and the canonical South Indian thali has clear staples Tutti is still missing. Adding the
core gravy (**Sambar**), a second dry stir-fry (**Cabbage Poriyal**), a lentil-vegetable
(**Kootu**), a rice-lentil one-pot (**Ven Pongal**), and a crowd-pleaser (**Potato Fry**) roughly
doubles the library and lets the Browse/search/pick/cook flow shine on a genuinely composable menu.
It's the highest-value, lowest-risk way to deepen the product: **frozen, human-verified data** that
flows through the exact same engine and UI (no LLM, Doc 1 §4), guarded by the existing library tests.

### Research findings folded in (web pass, June 2026)

- A traditional South Indian thali = **rice · sambar · rasam · poriyal · kootu · curd · pickle**.
  Tutti has rasam, curd rice, a poriyal, chutney, lemon rice, upma; it's missing **sambar, kootu, a
  second poriyal (cabbage), pongal, and a potato fry** — exactly the everyday Tamil-home staples
  (minimalist, coconut-forward dry curries + lentil gravies).
- Keep each recipe honest and verified: real steps, sensible durations, correct resources (passive
  simmer/cook vs active prep), so the scheduler interleaves them properly.

## Definition of done

The Golden Library contains ~11 verified veg South Indian recipes (the 6 existing + ~5 new), each a
valid, verified `RecipeGraph` that compiles to a feasible plan; the new dishes appear in Browse with
working search/filters and can be cooked through the normal flow; the existing library test (every
entry valid/verified/unique/compiles) covers them; gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Author the new recipes (engine data).** Add ~5 hand-written, verified veg South Indian
   `RecipeGraph`s to `packages/engine/fixtures/library.json` in the exact existing schema: **Sambar**
   (rec_sambar — soak/cook dal [passive], chop veg, simmer with sambar powder + tamarind [passive],
   temper, combine), **Cabbage Poriyal** (rec_cabbage — shred cabbage, temper mustard/urad/chili,
   sauté, finish coconut), **Mixed-Veg Kootu** (rec_kootu — cook dal [passive], chop veg, simmer,
   grind/add coconut paste, temper), **Ven Pongal** (rec_pongal — dry-roast rice+moong, pressure-cook
   [passive], temper pepper/cumin/cashew/ghee, fold), **Potato Fry** (rec_potato — boil/par-cook
   potato [passive], temper, sauté with turmeric+chili till crisp). Valid: acyclic, deps resolve,
   active vs passive correct, sane durations, ingredients with units, `verified:true`,
   `cuisine:"South Indian"`, unique recipeIds/nodeIds.
2. **Wire is automatic.** `goldenLibrary` already loads `library.json`; no code change needed beyond
   the data. Bump the library test's minimum-count assertion (>= 6 → >= 11) so it asserts the growth.
3. **Validate via the existing gate test.** `packages/engine/test/library.test.ts` already asserts
   every entry `validate().ok`, `verified===true`, unique ids, and compiles to a feasible plan — it
   now covers the new recipes. Run it; fix any invalid graph until green.
4. **Honest data.** Real, cookable recipes with believable quantities/timings; passive steps marked
   passive so the hands-as-a-resource interleaving stays correct. No placeholder junk.
5. **Verify in-browser (light).** Browse shows ~11 dishes; search "sambar" finds it; add Sambar +
   Cabbage Poriyal + rice → it schedules and cooks. (Covered structurally by the engine test;
   a quick glance confirms the UI.)

## Enforce-what-you-build
- every new recipe passes the engine library test (valid + verified + unique + compiles).
- the library count assertion reflects the new total.

## When substantially done
Run a web-research pass on the next gap (onboarding polish, a second cuisine, or another competitor
feature) and **author `docs/Research-Brief-v38-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://hebbarskitchen.com/veg-south-indian-thali-recipe-lunch-menu/
- https://easyindiancookbook.com/indian-vegetarian-thali-collection/
- https://www.vidhyashomecooking.com/indian-thali-platter-a-roundup/
