# DagChef — The Learning Loop & Curation Flywheel

**Document 10 of 10** · How every cook makes the next cook better
*Extends the content pipeline (Doc 5, 8), the adaptive model (Doc 2 §7), and the flywheel thesis (Doc 9)*
*Status: Draft v1 · Owner: Arun*

---

## 0. The question this answers

> We use LLMs to create and explore the DAGs. How does the app fold that — plus what real users do (follow, skip, reorder, extend) — back into a curated, accumulating database, so DagChef learns and keeps getting better?

This document designs that loop. It must do so **without breaking the one rule** (Doc 1 P2): the LLM and all learning happen **offline**, around a deterministic runtime. The cook never waits on a model. Learning improves the *content and the parser between sessions*, never the live cook.

### 0.1 The principle, restated for this context
```
 RUNTIME  = deterministic, frozen, trusted  (never changes mid-cook)
 LEARNING = offline, evidence-driven, human-gated  (improves the next version)
```
The flywheel turns *between* sessions. A user always cooks from a frozen, verified DAG; the data they generate proposes improvements to a *future* version of that DAG.

---

## 1. Three nested learning loops

DagChef learns at three radii, fastest-innermost. Keeping them separate is what makes the system safe and debuggable.

```
        ┌──────────────────────────────────────────────────────┐
        │  LOOP C · PARSER / MODEL  (slowest, weeks–months)      │
        │  human corrections + outcomes → better LLM parsing     │
        │   ┌────────────────────────────────────────────────┐  │
        │   │  LOOP B · GLOBAL LIBRARY  (medium, days–weeks)   │  │
        │   │  many users' behavior → better verified DAGs     │  │
        │   │   ┌──────────────────────────────────────────┐   │  │
        │   │   │  LOOP A · PER-USER  (fast, per session)    │   │  │
        │   │   │  your pace & habits → tuned to YOU         │   │  │
        │   │   └──────────────────────────────────────────┘   │  │
        │   └────────────────────────────────────────────────┘  │
        └──────────────────────────────────────────────────────┘
```

| Loop | Learns from | Changes | Latency | Trust gate |
|---|---|---|---|---|
| **A — Personal** | One user's own cooks | *Their* time estimates, defaults, mode | Instant / next session | None needed (only affects them) |
| **B — Library** | Aggregated behavior across users | The shared verified DAGs (durations, tags, deps, variants) | Days–weeks | **Human review** before publish |
| **C — Parser** | Reviewer corrections + library outcomes | The LLM prompt / fine-tune / eval set | Weeks–months | Offline eval + human |

Loop A already exists in spec (Doc 2 §7 adaptive pace). This document focuses on **B and C — how the crowd and the corrections improve the shared asset.**

---

## 2. What we capture (the event taxonomy)

Every cooking session emits a structured, privacy-respecting event stream. These are the raw signals; §3 turns them into meaning.

| Event | Captured data | What it can teach |
|---|---|---|
| `node_completed` | nodeId, **actual** duration, planned duration | Real durations → recalibrate estimates |
| `node_skipped` | nodeId, whether dependents still done | Step maybe unnecessary, or done implicitly |
| `node_reordered` | nodeId, observed order vs planned | A dependency is wrong/missing |
| `node_extended` | user added a step / sub-step (free text or template) | Recipe is missing a node many people add |
| `substitution_used` | from→to ingredient | Popular swaps → curated substitution table (Doc 6 §4) |
| `undo` | nodeId | Step marked done too early → ambiguous instruction |
| `passive_overrun` | nodeId, overshoot mins | Duration too short, or cue unclear |
| `session_abandoned` | last node, point in flow | A "cliff" where recipes lose people |
| `serve_hit` | planned vs actual serve time | Did the whole plan hold together? |
| `rating / note` | thumbs, optional comment, photo | Explicit quality signal |
| `kitchen_context` | burners, cooks, mode (anon) | Segment learning by kitchen type |

**Design rules for capture:**
- **On-device first, aggregate-only upload, opt-in** (privacy — §8).
- Always store *planned vs actual* together; the **delta** is the signal, not the raw number.
- Tag every event with the **DAG version** it happened on, so learning is attributable and old data doesn't pollute new recipe versions.

---

## 3. Interpreting signals (the genuinely hard part)

Raw behavior is ambiguous. The system's intelligence is in *not over-reacting*. A naive "users skipped step 4, delete it" would wreck recipes. Disambiguation rules:

### 3.1 A "skip" has at least three meanings
| Observed | Likely cause | Correct response |
|---|---|---|
| Skipped, but dependents still completed fine | Step was implicit / unnecessary for this cook | Lower its confidence; watch the trend |
| Skipped, then a later step failed/undone | Step *was* needed; user erred | Do **nothing** to the recipe; maybe clarify wording |
| Skipped + added a different step (extend) | User has a variant technique | Candidate **branch/variant**, not an edit to the main |

The system never acts on one interpretation; it holds competing hypotheses until evidence accumulates.

### 3.2 Statistical hygiene (don't let noise become "truth")
- **Minimum support:** no change is even *proposed* until N independent users on the same DAG version show the same signal (N tuned; high for structural changes, low for duration nudges).
- **Robust stats:** use medians/percentiles, not means (one cook who answered the phone shouldn't add 40 min to "simmer").
- **Segment before aggregating:** beginners vs pros, 2-burner vs 4-burner — a "skip" may be mode-specific, becoming a *mode default*, not a global edit.
- **Confidence, not certainty:** every proposed change carries a confidence score that decides whether it auto-applies (trivial) or needs human review (structural).

### 3.3 The change-risk ladder (who can approve what)
```
 duration nudge (±%)        → auto-apply if support+confidence high   (low risk)
 active/passive retag        → human review                           (medium)
 add/remove dependency       → human review                           (high — affects parallelism & safety)
 add/remove a node           → human review                           (high)
 anything safety-tagged      → expert review, NEVER crowd-decided      (critical — Doc 6 §5)
```
**Safety is never crowd-sourced.** A thousand users skipping "wash the board" does not delete the rule.

---

## 4. The curation pipeline (raw data → better library)

This is Loop B end-to-end. It is a deterministic data pipeline with a human gate, mirroring the original parse pipeline (Doc 5) — same philosophy: machine drafts, human approves.

```
 events ─▶ aggregate per (DAG version, node, segment)
        ─▶ detect signals (skip/overrun/reorder/extend) with support+confidence
        ─▶ generate CANDIDATE EDITS  (e.g. "po_3 sauté: median 13m vs 10m est, n=240, conf .9")
        ─▶ AUTO-APPLY trivial/low-risk   |   QUEUE structural for human review
        ─▶ human reviewer sees the proposed diff + the evidence + a re-compiled preview
        ─▶ approve → write a NEW VERSION of the RecipeGraph (old sessions unaffected)
        ─▶ A/B or canary the new version → confirm it actually improves outcomes
        ─▶ promote to default
```

Key properties:
- **Versioned, never destructive.** v4 of a recipe is a new frozen artifact; in-progress cooks on v3 are untouched (ties to Doc 8 §4 versioning).
- **Evidence travels with the proposal.** The reviewer sees *why* ("n=240, median +3 min, 18% overrun"), and the engine shows the *consequence* (re-compiled schedule), exactly like the parse review tool (Doc 5 §5).
- **Validated, not assumed.** A new version is A/B-tested against the old on real outcomes (serve-hit rate, abandonment, overruns) before it becomes default. We measure that the change *helped*.

---

## 5. Crowd-sourced recipe accumulation

How the *library itself grows* from users — turning "paste your own recipe" (Doc 5 §7) into an accumulating asset rather than a dead-end convenience.

### 5.1 The recipe lifecycle (candidate → golden)
```
 USER PASTES recipe ─▶ LLM parse (Doc 5) ─▶ deterministic validate (no cycles…)
   ─▶ CANDIDATE POOL  (unverified, badge-labelled, usable only by that user)
   ─▶ accumulates usage + behavior signals from anyone who tries it
   ─▶ if a candidate gets traction + clean signals ─▶ flagged for HUMAN REVIEW
   ─▶ reviewer + (food-safety gate) approve ─▶ GRADUATES to GOLDEN LIBRARY (verified)
```
A recipe earns its way into the trusted library through *both* usage evidence and human sign-off. Most candidates never graduate — and that's fine; they still serve the user who added them.

### 5.2 Deduplication & the "recipe genome"
Many users will paste near-identical Vatha Kuzhambu. We don't want 4,000 copies.
- **Canonicalization:** normalize ingredient names (the synonym table, Doc 6 §2) and node structure into a fingerprint.
- **Cluster** near-duplicate DAGs into one canonical recipe with **variants** (the branches from §3.1 — "some add drumstick," "some skip jaggery").
- The library becomes a **graph of canonical recipes + popular variant branches**, each annotated with how common it is and how it performs. This clustered, annotated corpus is the moat (Doc 8 §5, Doc 9).

### 5.3 Variants as first-class objects
An "extend" or a popular substitution isn't noise — it's a fork. The UI can later surface: *"40% of cooks add a splash of coconut milk here — want to?"* That's the crowd teaching the recipe, deterministically delivered as an optional branch the user can accept.

---

## 6. Closing the loop back to the LLM (Loop C)

The corrections humans make are the most valuable training signal in the whole system — they are labeled "the LLM got this wrong, here's right."

- **Every reviewer correction** (in both the parse pipeline and the curation pipeline) is logged as a `(input recipe text, bad LLM output, corrected DAG)` triple.
- These become: (a) a growing **evaluation set** to measure parser accuracy over time (Doc 5 §6), and (b) **fine-tuning / few-shot exemplar** data to make the parser draft better DAGs next time — especially on the systematic errors (e.g. the model keeps mis-tagging "rest" as active).
- **Behavioral outcomes feed back too:** if real durations consistently beat the LLM's estimates by 25% on sauté tasks, that bias is corrected at the source — better priors in the prompt, not just patched per-recipe.
- Result: the parser needs *less* human correction over time → cheaper content ops (Doc 8 §4) → faster library growth. **The accuracy metric and the unit-cost metric are the same lever.**

---

## 7. How this concretely improves the user experience

The flywheel isn't abstract; it shows up as:

- **Honest timings.** Estimates converge on reality (per kitchen type), so the serve-time promise (Doc 1 P7) holds more often.
- **Truer parallelism.** Wrong/missing dependencies get fixed, so the schedule interleaves better and saves more time.
- **Fewer cliffs.** Abandonment hotspots reveal confusing steps to rewrite.
- **Crowd wisdom, opt-in.** "Most cooks add X here / skip Y / swap Z" surfaced as optional branches.
- **Better defaults per kitchen.** 2-burner cooks get plans tuned from other 2-burner cooks.
- **A library that compounds.** Every cuisine the crowd cooks deepens — coverage and quality grow without proportional editorial cost.

---

## 8. Governance, privacy & safety (the guardrails)

| Concern | Rule |
|---|---|
| **Privacy** | On-device capture; upload **aggregates/anonymized** only; explicit **opt-in**; clear value exchange ("help improve recipes") |
| **No raw degradation** | Crowd signals **propose**, humans **dispose**; trusted library never edited by raw telemetry |
| **Safety** | Food-safety rules (Doc 6 §5) are **never** crowd-decided; expert-gated only |
| **Versioning & rollback** | Every change is a new version; bad versions roll back; in-progress cooks unaffected |
| **Bias control** | Segment + minimum-support + robust stats so loud minorities don't reshape recipes |
| **Transparency** | Variants shown as "X% of cooks…", not silent edits; users keep agency |
| **Attribution/IP** | User-contributed recipes handled per content policy (Doc 8); graduation needs rights-clean status |

---

## 9. Cold start & critical mass

The flywheel is weak until data accumulates. Bootstrapping:
1. **Seed with owned, expert-authored recipes** (Doc 8) so quality is high *before* any crowd data.
2. **Loop A (personal) works from day one** with zero network — instant per-user value while the crowd is small.
3. **Concentrate the crowd:** one cuisine vertical (Doc 9) reaches per-recipe critical mass far faster than spreading thin — the same Kuzhambu cooked by many quickly yields strong signals.
4. **Internal cooks + beta testers** generate the first correction triples for Loop C before public scale.

---

## 10. Metrics for the flywheel itself

We measure that learning is actually happening:
- **Estimate error over time** (planned vs actual duration MAE — should fall).
- **Serve-hit rate over time** (should rise).
- **Abandonment-cliff count** (should fall as confusing steps get fixed).
- **Parser accuracy on the growing eval set** (Doc 5 §6 — should rise → review-minutes/recipe fall).
- **Candidate→golden graduation rate** and **time-to-graduate**.
- **% recipes with ≥1 crowd-validated improvement shipped.**
- **Coverage growth** (recipes/cuisines) **per editorial hour** — the compounding signal.

---

## 11. Build sequencing (when each loop turns on)

| Capability | Turns on at (vs Doc 3) | Why then |
|---|---|---|
| Loop A — personal pace | Phase 4 (already specced, Doc 2 §7) | Works solo, no scale needed |
| Event capture (telemetry) | Phase 2–3 | Start logging early, even before acting on it |
| Loop B — curation pipeline | Post-MVP, once a user base exists | Needs minimum support per recipe |
| Crowd recipe accumulation | Post-MVP, after "paste your own" ships | Needs the candidate-pool plumbing |
| Loop C — parser improvement | Continuous, from first reviewer corrections | Every correction is training data immediately |
| Variant surfacing in UI | After Loop B proves clusters are good | Don't surface noisy branches early |

**Start capturing early, start *acting* carefully.** Log from Phase 2; only let signals change content once support and the human-review tooling are in place.

---

## 12. The whole flywheel in one picture

```
        author/seed ─┐
                     ▼
  ┌────────▶  GOLDEN LIBRARY (versioned, verified, frozen)  ◀────────┐
  │                  │                                                │
  │                  ▼  user cooks a frozen DAG                       │
  │            DETERMINISTIC RUNTIME  (no LLM, instant)               │
  │                  │                                                │
  │                  ▼  emits planned-vs-actual + skip/extend/reorder │
  │            EVENT STREAM (on-device, opt-in, anonymized)           │
  │                  │                                                │
  │                  ▼  aggregate · disambiguate · support+confidence │
  │            CANDIDATE EDITS & CANDIDATE RECIPES                    │
  │                  │                                                │
  │      auto-apply trivial │ human-review structural │ expert-gate safety
  │                  │                                                │
  │                  ▼  A/B / canary → confirmed improvement          │
  └──────────  NEW VERSION published  ───────────────────────────────┘
                     │
                     ▼  reviewer corrections become training data
              LLM PARSER gets better → cheaper, denser library → repeat
```

Every cook feeds the library; the better library makes every next cook better; the corrections make the LLM cheaper; the cheaper LLM grows the library faster. That compounding loop — not any single recipe — is DagChef's durable advantage (Doc 9 §2, Doc 8 §5).

---

*End of Document 10. The set is now ten documents: design (1), engine (2), roadmap (3), validation (4), parsing (5), domain (6), UX (7), licensing (8), business (9), and the learning loop (10).*
