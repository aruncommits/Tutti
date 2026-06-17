# DagChef — LLM Parsing & Review Spec

**Document 5 of 9** · The one place the LLM is allowed to operate
*Implements Track C of Doc 3 · the offline content pipeline of Doc 1 §4*
*Status: Draft v1 · Owner: Arun*

---

## 0. Boundary restated (so nobody forgets)

The LLM does **exactly one job, exactly once, offline**: turn messy recipe text into a candidate `RecipeGraph`. It is then checked by deterministic validators and approved by a human before it is ever cooked from. It never runs at cook time. (Doc 1 P2.)

This document specifies that pipeline: the prompt, the output contract, how we measure whether the LLM is good enough, and the human review tool that is the real safety net.

```
 raw text/URL ─▶ [LLM PARSE] ─▶ candidate DAG ─▶ [VALIDATE] ─▶ [HUMAN REVIEW] ─▶ Golden Library
                  this doc §2-3      §2.2            §4              §5            (frozen, versioned)
```

---

## 1. Design stance: the LLM is a *draft writer*, not an author

We assume the LLM will be **mostly right and occasionally, confidently wrong**. The entire pipeline is built around that assumption:
- Make the LLM's job as small and structured as possible (narrow tasks beat open-ended ones).
- Catch structural errors with deterministic code (cycles, bad refs) — no LLM needed to find these.
- Catch *semantic* errors (wrong dependency, silly duration) with a human, assisted by lints.
- Never ship raw output to a cooking user.

---

## 2. The output contract

### 2.1 Target schema
The LLM must emit a `RecipeGraph` exactly per Doc 2 §2.1–2.2, via **strict structured output / function-calling** (not free text we parse). Fields it must produce per node: `title`, `instruction`, `phase`, `attention`, `duration{estMins,minMins,maxMins,elastic}`, `ingredients[]` (with `amount`, `unit`, `preparedState`), `resources[]`, `dependencies[]`. It must NOT set `status` (runtime-only).

### 2.2 Hard guarantees enforced *after* the LLM (deterministic, not trusted to the model)
1. Valid JSON matching schema (reject + repair-retry if not).
2. No circular dependencies (Kahn's algorithm — Doc 2 §3).
3. Every `dependencies[]` id and ingredient reference resolves to a real node.
4. Exactly one (or clearly-marked) terminal `serve` node; no orphans.

The LLM is *asked* to honor these, but compliance is *verified*, never assumed.

---

## 3. The parsing prompt (v1)

Structured as a system prompt + the raw recipe as user content. Decomposed into explicit sub-tasks because narrow instructions parse far more reliably than "make a DAG."

```
SYSTEM:
You convert a single human recipe into a structured Directed Acyclic Graph of
kitchen tasks. You output ONLY via the provided function schema. Follow these
rules exactly.

1. ATOMICITY. Break the recipe into the smallest meaningful task nodes. One
   physical action per node (e.g. "chop onions" is separate from "sauté onions").

2. PHASE. Tag every node:
   - "prep"  = knife work, measuring, soaking, blending. NO heat.
   - "cook"  = heat is applied.
   - "serve" = final plating/resting/garnish.

3. ATTENTION. Tag every node:
   - "active"  = requires the cook's hands continuously (chopping, stirring,
                 tempering, flipping).
   - "passive" = proceeds without the hands (simmering, boiling, baking,
                 resting, marinating). The cook can walk away.
   When unsure, default to "active" (the SAFE choice — never tell a cook they
   are free when they are not).

4. DEPENDENCIES. A node depends on another ONLY if it physically cannot start
   until the other is complete (e.g. "sauté onions" depends on "chop onions").
   Do NOT invent ordering that the physics of cooking does not require —
   false dependencies destroy parallelism. List dependencies by nodeId.

5. INGREDIENTS. Attach each ingredient to the EXACT node where it is added,
   with amount, unit, and preparedState if any ("1 tsp cumin", "8 brinjals slit").
   Never produce a separate global ingredient list.

6. DURATION. Give estMins plus a plausible minMins/maxMins range. Set
   elastic=true ONLY for hands-on tasks that scale with cook speed (chopping,
   kneading). Set elastic=false for fixed-physics tasks (a 15-min simmer is
   15 min for everyone). When the recipe says "until golden/done", estimate
   realistically and widen the range.

7. RESOURCES. List physical equipment each node occupies while running
   (burner, oven, pan, blender, pressure_cooker, cutting_board), with count
   and any capability tags ("large", "heavy_bottom"). Do NOT add a "hands"
   resource — the engine derives that from attention.

8. HONESTY. If the recipe is ambiguous, make the most conservative choice and
   add a "reviewerNote" on that node explaining the assumption. Never silently
   guess on anything that affects timing or safety.

Output strictly via the function schema. Do not include prose outside it.

USER:
<<raw recipe text or fetched page content>>
```

**Notes on prompt design choices:**
- Rule 3's "default active when unsure" encodes Principle P3 (fail safe) into the model's behavior.
- Rule 4 explicitly warns against *false* dependencies — the most damaging error, because it silently kills the parallelism that is the whole product.
- `reviewerNote` gives the human reviewer a flag exactly where the model was unsure, making review fast.

---

## 4. Deterministic validation gate (the cheap net)

Runs automatically on every parse, before a human sees it. Reuses Doc 2 §3 `validate()`. Produces:
- **Blocking errors** (reject, auto-retry the LLM once with the error fed back): schema violation, cycle, dangling reference, orphan node.
- **Warnings** (surface to reviewer, don't block): duration outside category norms, prep output never consumed, unknown equipment word, an `active` node longer than 25 min (suspicious), a `passive` node holding `hands`.

A small **repair loop**: on a blocking error, re-prompt the LLM once with the specific validator error appended ("Your output had a cycle: kz_4→kz_5→kz_4. Fix and re-emit."). If it fails twice, route to a human as "needs manual authoring."

---

## 5. The human review tool

The real guarantor of quality. A lightweight internal web tool — **not** user-facing. One reviewer should approve a typical recipe in a few minutes.

### 5.1 What the reviewer sees
- **Side-by-side:** original recipe text | parsed DAG rendered as a visual graph (nodes colored by phase, shaped by active/passive).
- **The computed schedule preview:** the engine's `compile()` run on this single recipe, so the reviewer sees the *consequences* of the parse (e.g. "this says the simmer is active — that's why nothing parallelizes").
- **Warnings & reviewerNotes** highlighted inline on the relevant nodes.

### 5.2 What the reviewer can do
- Edit any field (retag active/passive, fix a duration, add/remove a dependency, fix a measurement).
- Split or merge nodes.
- Add equipment.
- **Approve & freeze** → writes a versioned, `verified:true` `RecipeGraph` to the Golden Library.
- **Reject → manual author** for hopeless parses.

### 5.3 Review checklist (the human's job, codified)
1. Are any **dependencies false** (killing parallelism) or **missing** (unsafe ordering)?
2. Is every **simmer/bake/rest tagged passive** (the interleaving payoff)?
3. Are **durations sane** for a real kitchen?
4. Is anything **food-safety sensitive** mis-ordered (raw protein handling, hold temps)? (Ties to Doc 6.)
5. Do the **measurements** match the source?

---

## 6. How we measure if the LLM is good enough (accuracy test)

We do not "trust the vibes." We measure parse quality against human ground truth before relying on the pipeline.

### 6.1 Ground-truth set
Hand-author ~20 recipes as DAGs (the Phase 0 thali fixtures are the first 3). These are the "answer key."

### 6.2 Metrics (per recipe, then averaged)
| Metric | Definition | Why it matters |
|---|---|---|
| **Node coverage** | % of ground-truth actions captured as nodes | Missing steps = broken cook |
| **Phase accuracy** | % nodes with correct prep/cook/serve | Drives safety & organization |
| **Attention accuracy** | % nodes with correct active/passive | **The interleaving engine** |
| **Dependency precision** | of predicted deps, % that are real | False deps kill parallelism |
| **Dependency recall** | of real deps, % predicted | Missing deps = unsafe order |
| **Duration MAE** | mean abs error in minutes | Drives the serve-time promise |
| **Measurement accuracy** | % ingredient/amount/unit correct | Trust & correctness |

### 6.3 Bars to clear before the pipeline is "production"
Indicative targets (tune with data): attention accuracy ≥95% (safety-critical), dependency precision ≥90% (parallelism-critical), node coverage ≥98%. Below bar → keep humans heavily in the loop and/or improve the prompt; the bars decide how much human review each recipe needs, not whether we ship.

### 6.4 The point of measuring
The accuracy numbers set the **review intensity**: a 99%-accurate parser needs a light human skim; an 85% one needs careful editing. Either way the human gate stays — measurement just tells us how much human time each recipe costs, which drives the content-ops budget (Doc 8).

---

## 7. The optional "paste your own recipe" path (post-MVP)

Same parser, but the user skips human review. Therefore:
- Output is labeled **"unverified — auto-parsed"** with a visible badge.
- Still runs the full deterministic validation gate (no cycles, etc.).
- Conservative defaults applied (ambiguous → active, durations widened).
- Never mixed silently into the trusted library; it's clearly the user's own risk.

This is a convenience feature, never the default, never the launch experience.

---

*End of Document 5. Next: Document 6 — Extended Domain Model (scaling, shopping list, heat, allergens, food safety).*
