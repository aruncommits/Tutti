# Research Brief v3 — Recipe Ingestion (Track C, pulled forward)

*Status: active · Phase 3 of our adapted roadmap · authored by the unattended loop after Phase 2*

## Rationale — why this, now

Phases 1–2 give a proven engine and a polished single-recipe cook experience driven entirely by
the golden thali. But the user's core requirement is that Tutti works for **any meal**: "paste a
recipe, or search online and get the recipe, or use AI to get the recipe, add the next one and the
next — then the app designs the DAG." That is **recipe ingestion**, and without it Tutti can only
cook three hard-coded dishes. So we pull Track C (Doc 5) forward now, ahead of multi-dish polish.

The boundary rule is sacred (Doc 1 P2, Doc 5 §0): the LLM runs **only here, offline, before
cooking**, turning messy recipe text into a candidate `RecipeGraph` that the deterministic
`validate()` gate checks. The cook path never calls an LLM. We already have the seam: the
`@tutti/ingest` package with a `RecipeParser` interface + `MockParser` + the engine's `validate()`.

### Research findings folded in (web pass, June 2026)

- **Structured output via tool-calling beats format-enforcing prompts.** Bind the `TaskNode`/
  `RecipeGraph` schema as a tool the model must call, so output is natively structured and parsed
  reliably — don't hand-parse free text. (Anthropic tool use / structured outputs.)
- **"Find online" should prefer schema.org Recipe JSON-LD, not blind scraping.** Most recipe
  sites embed `<script type="application/ld+json">` with a `Recipe` object (name, ingredients,
  instructions). Extracting that is **deterministic, key-free, robust, and legally safer** than
  scraping prose. Fall back to AI-parsing page text only when no JSON-LD is present.
- **Legality/ethics:** respect `robots.txt`; extract **facts** (ingredients, steps), not copyrighted
  creative expression; keep user-pasted/own recipes private to that user (Doc 5 §7). The library
  stays human-verified; ingested recipes are **"unverified"** until reviewed.

## Definition of done (phase metric)

A user can **Add a dish** three ways — Paste text, Find online (URL), Ask AI — repeat for N dishes,
then **Build plan**; each ingested recipe passes `validate()` (or shows errors), carries an
"unverified" badge, and the resulting multi-recipe plan cooks in the existing Cook Mode. The
deterministic gate (typecheck + tests + smoke + a11y) never requires an API key.

## Items — small, ordered, independently testable (keep the gate green after each)

1. **JSON-LD recipe extractor (deterministic, key-free).** In `@tutti/ingest`, add
   `extractJsonLdRecipe(html)`: find `application/ld+json` blocks, locate a `Recipe` (incl. `@graph`),
   map name + `recipeIngredient` + `recipeInstructions` into a **draft** node list. Unit-test against
   a sample JSON-LD fixture. This is the backbone of "Find online".
2. **Heuristic text→draft parser (deterministic fallback).** `draftFromText(text)`: split lines
   into steps, detect prep vs cook by keyword, mark passive (simmer/bake/rest) vs active, attach
   measurements via a simple quantity regex. Conservative defaults (ambiguous → active, Doc 5 §3
   rule 3). Produces a candidate `RecipeGraph`; runs `validate()`. Improves MockParser into something
   genuinely useful with **no key required**.
3. **`AiParser` behind `ANTHROPIC_API_KEY` (the real LLM path).** Implement `RecipeParser` using the
   Doc 5 §3 system prompt with **tool/structured output** bound to the `RecipeGraph` schema; the
   `validate()` **repair loop** (Doc 5 §4): on a blocking error, re-prompt once with the error, then
   route to manual. Guard: if no key, `AiParser` is unavailable and the UI offers paste/JSON-LD only.
   Keep all network/LLM code out of `@tutti/engine`.
4. **URL fetch + pipeline for "Find online".** `fetchRecipeFromUrl(url)`: fetch, try
   `extractJsonLdRecipe`, else `draftFromText` (or `AiParser` if key present). Note robots/ToS
   caveat in code comments; facts-not-prose.
5. **Add-dish UI (Doc 5 §7 + user's vision).** A screen reachable from Home/Pick: **Add dish →
   {Paste · Find online · Ask AI}**, each opening the right input; on success the candidate recipe
   joins a user "candidates" list (persisted) with an **"unverified — auto-parsed" badge**; repeat
   for N dishes; then they appear in Pick alongside the golden thali and feed `compile()`.
6. **Validation feedback UI.** Show `validate()` errors/warnings inline (cycle, dangling ref, lint)
   so a bad parse is visible, never silently cooked. Reuse the engine result shape.
7. **Tests.** ingest: JSON-LD extraction, text-draft → valid graph, repair-loop logic (mock the LLM
   call — no real key in CI). web: add-dish flow renders and a pasted recipe becomes schedulable.

## Enforce-what-you-build (gate additions)
- ingest contract test extended: any parser output that claims `ok` must pass engine `validate()`.
- a key-absence test: with no `ANTHROPIC_API_KEY`, the paste/JSON-LD paths still work.

## When substantially done
Run the Phase-3 web-research pass (multi-dish resource contention UX, allergen/scaling — Doc 6,
shopping-list consolidation, recipe dedup) then **author `docs/Research-Brief-v4-multi-dish.md`**
inline (Doc 3 Phase 3 / Doc 6): multi-dish Cook Mode polish, scaling/servings, shopping list,
allergen warnings. Lead with rationale. The loop never ends.

## Sources (research pass)
- https://agenta.ai/blog/the-guide-to-structured-outputs-and-function-calling-with-llms
- https://github.com/imaurer/awesome-llm-json
- https://github.com/hhursev/recipe-scrapers
- https://www.raymondcamden.com/2024/06/12/scraping-recipes-using-nodejs-pipedream-and-json-ld
- https://medium.com/@ridhopujiono.work/web-scraping-2-ethics-legality-robots-txt-how-to-stay-out-of-trouble-39052f7dc63f
