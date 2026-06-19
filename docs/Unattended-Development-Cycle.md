# The Unattended Development Cycle — a universal playbook

A pattern for running an AI coding agent as a **continuous, self-pacing dev loop** on *any*
software project — building something new, or enhancing / improving / hardening something that
exists. The loop wakes itself on a timer, does one small **green** increment, writes its own next
plan when the current one is done, recovers itself after stalls, and never idles until you say
**"stop."**

This document is fully app-agnostic. Wherever you see `<APP>`, `<repo>`, `<theme>`, or
`<health check>`, substitute your own. Copy the prompt templates verbatim into a new project to
start a loop.

The doc has two halves:
- **Parts A–B + E–G** — the *machinery and discipline*: how to run the loop and keep each turn safe.
- **Parts C–D + F** — the *craft and judgment*: what to research, how to work alongside a human, and
  the hard-won meta-lessons that only come from having run it.

---

## Part A — The loop machinery

### A.1 The mental model

Three moving parts keep the loop alive and honest:

1. **The self-re-arming wake-up.** Every turn ends by scheduling the *next* turn (~60s out) with the
   *same* continuation prompt. This is the heartbeat of the chain — **miss it once and the loop
   dies.** (Re-arm **last**, every time.)
2. **A durable state file** (`<repo>/.loop-state.json`) the loop stamps every turn — proof of life,
   plus the iteration count and a "what's next" pointer that survives across context windows.
3. **A slow backstop schedule** (e.g. every ~10–15 min) that only *checks* freshness and revives the
   fast chain if it stalled (a usage-limit window, a crash). It does nothing if the loop is alive.

The work itself is driven by a **research brief** — a committed `.md` plan in the repo
(`docs/Research-Brief-vN-*.md`). The loop executes one brief in small increments; when the brief's
items are done it **authors the next brief itself** (inline — see Part C) and continues. Background
"go research and plan" sub-agents proved unreliable; author briefs inline, grounded in what you just
built.

### A.2 Pacing the wake-up (cache-aware)

The model's prompt cache has a short TTL (commonly ~5 min). Pick the wake-up interval accordingly:
- **Actively polling external state** the harness can't notify you about (a CI run, a deploy): use a
  **short** interval (well under the cache TTL) so context stays cache-warm.
- **Idle ticks / just keeping the chain alive:** use a **long** fallback (tens of minutes). Don't
  burn the cache with frequent wake-ups when nothing is changing.
- Don't poll work the harness already tracks (a backgrounded build/agent) — you're re-invoked on its
  completion. Polling it is wasted cache and tokens.

### A.3 Starting a loop on a new project (kickoff)

Send **one kickoff message** containing everything the loop needs to re-derive its job each turn (it
must be self-contained — assume *no* memory between turns):

> Set up an unattended dev loop on `<APP>` (`<repo>`). Create `<repo>/.loop-state.json` with
> `{ "focus":"<theme>", "mode":"until-stop", "iteration":0, "lastTick":"", "lastTickEpoch":0,
> "phase":"<phase>", "nextResearchTheme":"" }`, author `docs/Research-Brief-v1-*.md` (lead with
> rationale; small ordered testable items; end with "when done, author v2"), confirm
> auto-accept/bypass-permissions is on so the loop isn't blocked on prompts, create the slow backstop
> schedule, then begin the loop below. [paste the Part A.4 continuation prompt]

Thereafter, every turn re-sends the **same** continuation prompt verbatim — the loop reads its state
file + current brief and continues.

### A.4 The per-turn continuation prompt (template)

Keep this stable and re-send it verbatim each turn. Fill the `<...>` slots; update only the one line
that says where the current brief stands.

```
Continue the UNATTENDED dev loop on <APP> (<repo>). Standing directive: ACTIVE THEME = <theme> —
build phase-by-phase, then research+enhance each phase, forever until "stop".
Standing constraints: <e.g. external work in flight — adapt, do not revert; secrets/deps policy;
performance budget; known footguns>.

GATE-FIRST each turn: confirm the app is up (<health check>) and <typecheck> is clean. Build the
CURRENT brief in small plan→dev→test increments. Run the gate WITHOUT masking its exit:
`<gate cmd> > /tmp/gate.log 2>&1; echo GATE_EXIT=$?; tail -N /tmp/gate.log` and only commit when
GATE_EXIT=0. <Any single-test gotcha for your stack.>

CURRENT PLAN: docs/Research-Brief-<vN>-*.md. <ONE line: where it stands + the next concrete step,
written at code level — exact files/signatures/edits.>

When the brief is substantially done: run a WEB-RESEARCH pass (<your relevant research dimensions —
see Part C>), then AUTHOR docs/Research-Brief-<vN+1> inline (lead with rationale). The loop never ends.

PER-TURN MECHANICS: if servers are down, restart (<commands>, background). Stamp <repo>/.loop-state.json
every turn — set lastTick + bump iteration + update phase/nextResearchTheme (write it via a real
program/heredoc, not shell string interpolation). Commit each green increment. ALWAYS end the turn by
re-arming the ~60s wake-up with this SAME prompt or the chain dies (the slow backstop is the only
safety net). Keep increments small and green; no big risky sweeps. Run until the user says "stop".
```

### A.5 The heartbeat / revive prompt (slow backstop)

A separate, slower schedule fires this. It verifies freshness and only revives on a real stall:

```
HEARTBEAT — resilience backstop. Verify via timestamp FIRST; don't assume the fast loop is alive.
STEP 1: read <repo>/.loop-state.json. If (now - lastTick) < 10 min, reply exactly
  "heartbeat: loop alive (lastTick fresh)" and END — do nothing else (avoid double-running).
STEP 2 (only if lastTick is missing or > 10 min): the fast chain stalled (likely a usage-limit
  window that has now reopened). Resume as if no break: restart servers if down, re-enter the loop on
  the CURRENT brief, stamp lastTick + bump iteration, and re-arm the fast wake-up. Never stop unless
  the user said "stop".
```

### A.6 The state file (`<repo>/.loop-state.json`)

```json
{
  "focus": "<active theme>",
  "mode": "until-stop",
  "iteration": 97,
  "phase": "<current phase or brief>",
  "lastTick": "2026-06-18T16:52:10.123+05:30",
  "lastTickEpoch": 1781905930,
  "nextResearchTheme": "<vN status + the next brief's one-line pointer — honest, incl. blockers>"
}
```

`iteration` is a monotonic heartbeat counter; `lastTick`/`lastTickEpoch` are freshness;
`nextResearchTheme` is how the loop tells its future self what's done and what's next once the
conversation has been compacted away.

### A.7 Stopping cleanly

When the user says "stop" (or "finish pending tasks, then stop"): finish/commit the in-flight green
increment, then **tear the loop down** — delete the backstop schedule, **do NOT re-arm** the fast
wake-up, mark the state file `"mode":"STOPPED"` with a note on how to resume, and give a final
summary. A loop that isn't explicitly stopped will keep waking itself.

---

## Part B — Engineering discipline each turn

- **Gate-first, every turn.** Before building anything, run the gate: it surfaces external breakage
  before you build on a broken base.
- **The layered cheap gate.** The cheapest set of checks that, all-green, means "safe to continue":
  typecheck + a smoke/health check of the running app + tests + a production build + any
  deploy-shape checks (bundle/perf budget, offline/PWA manifest, lint). Cheap enough to run *every
  turn*, strong enough that "all green" genuinely means safe.
- **Never mask the gate's exit code.** Capture the exit first, then read logs
  (`<gate> > log 2>&1; echo EXIT=$?; tail log`). Piping straight into `tail`/`head` swallows the
  failure and you'll commit red.
- **Small green increments.** One surface or fix per turn; no big risky sweeps. A broken gate halts
  everything downstream; a large unsupervised change is how an unattended loop wrecks a repo.
- **Commit each green step**, with a message that says *what* and *why*.
- **Enforce-what-you-build.** Every feature adds a tiny assertion to the gate (a served-markup check,
  a label/role check, a budget line) so a later turn can't silently regress it.
- **Honesty over progress theater.** If an audit finds a surface already done, say "already done" and
  move on — don't rebuild it to look busy. If tests fail, report them with their real output. The
  loop's value is *verified* green increments, not motion.
- **Performance budgets & "no budget rot."** Keep a build-time budget guard (bundle/entry size, a
  Core-Web-Vitals proxy) that *fails the gate* on regression. When it fires, **trim or code-split
  before raising the baseline.** Decide the **raise policy up front**: incidental *creep* → trim; a
  *deliberate* architecture/scope change → one documented bump with the reason and the long-term fix
  noted. (This loop hit exactly this tension — having the policy ready avoids improvising it.)
- **Robustness patterns.** Validate/repair persisted state on read (don't trust storage); add error
  boundaries / graceful degradation so one component's failure never blanks the whole app; wrap
  quota- or failure-prone writes (storage, network) in guards.
- **Real-behavior verification per phase.** Beyond unit tests, drive the *running* app (browser
  automation / MCP) and run real audits (accessibility, performance, security). They catch what unit
  tests can't — then **lock each finding with a structural test** so it can't silently regress.
- **Fix the failure CLASS, not the instance.** The first time a *kind* of failure appears (e.g. a
  flaky async / lazy-loaded test, an un-awaited render), harden *every* place that shares the pattern
  in the same turn. Fixing one occurrence and getting bitten by its siblings turn after turn is pure
  waste — it happened here.

---

## Part C — The research pass: what to research, for any software

When a brief's items are substantially done, run a **web-research pass** before authoring the next
brief. Research is not decoration — it changes *what* you build, and sometimes **rejects** a feature
outright (a well-justified "don't build this" is a successful research pass). Cover the dimensions
relevant to your project:

1. **Domain algorithms & data structures** — the core problem's known/optimal solutions, complexity,
   standard heuristics. Don't reinvent a solved problem.
2. **Competitor / prior-art features** — what mature products in the space already do, and the gap
   your project can exploit. Tells you the table-stakes set and the differentiators.
3. **UI/UX patterns** — platform conventions, mobile-first vs desktop, glanceability, motion,
   and the states people forget: empty, loading, error, first-run/onboarding.
4. **Accessibility** — WCAG 2.2: contrast, accessible names/labels, focus management, keyboard
   operability, screen-reader semantics. *(Research here once killed a planned feature: single-key
   shortcuts conflict with WCAG 2.1.4 — the research said "don't," and that was the right outcome.)*
5. **Performance** — Core Web Vitals (LCP / INP / CLS), bundle splitting, what must stay on the
   critical/instant path vs what can be lazy.
6. **Security & privacy** — OWASP basics; keep secrets server-side and out of client bundles;
   authn/authz on *every* endpoint, including "internal"/dev ones (they're common SSRF/IDOR/quota-
   burn targets); host-header / DNS-rebinding checks for local servers; secure-by-default; data
   residency / local-first where it matters.
7. **Testing strategy** — property-based tests for invariants; contract tests at module/service
   boundaries; end-to-end journey tests; and clarity on *what each layer actually catches* so the
   gate isn't redundant or blind.
8. **Offline / resilience / installability** (where relevant) — PWA, service worker, precaching,
   reconnection, retry/backoff.
9. **Internationalization / units / locale** (where relevant) — formatting, RTL, unit systems.
10. **Observability & telemetry** — honest, privacy-respecting metrics; structured logs; error
    reporting — enough to know the thing works in the wild without surveilling users.

**How to run the pass:** web-search each relevant dimension, **fold the findings into the next brief**
(lead with *why this, now*), **cite the sources**, and let the findings change — or cancel — the plan.

---

## Part D — Working alongside humans & other tools (adapt, don't revert)

The repo is shared. Other people and tools (linters, formatters, other agents, the owner) will edit
it between — and during — your turns.

- **Gate-first surfaces external edits.** The first thing each turn (typecheck + smoke) reveals what
  changed. **Never revert others' work — adapt to it** as the new baseline. Absorb their redesigns,
  refactors, and renames; build *around* them.
- **Have a pre-decided protocol for concurrent human edits** (this loop improvised it under pressure
  and *thrashed* — the decisions were right but slow; pre-deciding makes it calm):
  1. **Don't race a moving file.** Expect every read to be stale; act fast, or wait for quiescence.
  2. **Separate "my increment is green" from "the whole tree is green."** When their WIP breaks the
     *shared* gate, verify *your* delta in isolation (targeted tests), and **commit only your files,
     selectively** — first checking your committed set has **no dangling references** into their
     unfinished code.
  3. **Wait for their tree to settle** before attempting a full-gate commit that includes their work.
  4. **Don't stash/guess their intent** or re-architect their just-committed feature mid-session.
  5. **Protect your own work.** Uncommitted work can be lost to someone's `git reset` — land your
     provably-green delta rather than leaving it sitting in the tree.
- **Security findings on others' code: acknowledge or fix.** Prefer authoring a tracked fix-it brief
  over colliding in their live file. When you do fix, make it **secure-by-default but workflow-
  preserving** — analyze intent first (an "insecure" setting may be a deliberate dev/test choice), and
  fix with an *opt-in* rather than a blanket lock that breaks their use case.
- **Respect locked constraints even when breaking them is convenient.** When external code needed a
  dependency the project's "no new deps" rule forbade, the right move was to *not* add it and surface
  it — not to override a standing constraint unattended.

---

## Part E — Hard-won footguns

- **Re-arm last, always.** The turn isn't done until the next wake-up is scheduled. If you do only one
  thing, do that.
- **One clock for stamp *and* compare.** Stamping `lastTick` in UTC while the heartbeat compares
  against local time makes a 2-minute-old tick read as *hours* stale, triggering false revives. Pick
  one clock for both. Beware that some JSON round-trips re-localize ISO strings — verify what actually
  lands on disk.
- **Write generated files via a real program or heredoc — never shell string interpolation.** The
  failure isn't one shell; it's *all* of them. Stamping JSON or a multi-line commit message by
  interpolating into a quoted shell string breaks on the first quote/apostrophe in the content — an
  apostrophe in `"don't"` broke a `node -e` stamp the same way escaped quotes broke PowerShell. Use a
  small script reading/writing the file, or a heredoc.
- **Single-test gotchas live in the workspace.** Test-env config (jsdom, setup files, path aliases)
  often lives at the package/workspace level — run a single test *from there*, not the repo root, or
  it fails for environment reasons unrelated to your change.
- **Self-contained turns.** Any turn may start from a summarized/compacted context. The prompt + state
  file + brief must carry everything — **the conversation is not your memory.**
- **Near an active human, expect every file read to be stale.** Batch your understanding and act, or
  wait for them to pause.
- **Recover terse.** On a backstop heartbeat, if the loop is fresh, reply with the exact terse string
  and END — don't double-run the work.

---

## Part F — The craft: planning, depth, and restraint

The part that can't be web-searched. These are the judgment patterns — and the honest misses — that
separate a loop that compounds value from one that spins.

### F.1 The brief template that worked, every time

Every `Research-Brief-vN-*.md`:

1. **Rationale — why this, now.** Lead with it. If you can't write a crisp "why now," it isn't the
   next thing. This single discipline is what keeps a forever-loop from building filler.
2. **Research findings folded in** (with cited sources) — what the web pass changed about the plan.
3. **Definition of done** — one paragraph; what "this phase is complete" concretely means.
4. **Small, ordered, independently-testable items** — each shippable as its own green increment.
5. **Enforce-what-you-build** — the assertion(s) this phase adds to the gate.
6. **When substantially done** — author the next brief inline; the loop never ends.

### F.2 The continuation prompt IS your memory

Because any turn may resume from a compacted context, the re-arm prompt must carry the **code-level**
next step — exact file paths, function signatures, the literal edit — not "continue the feature."
Vague pointers fail post-compaction; concrete ones let a cold context execute immediately. Likewise,
stamp the state file every turn — **including when blocked** — with an honest `nextResearchTheme`
("done & green but UNCOMMITTED because a human is mid-build; reconcile when their tree settles"), not
a rosy summary. Your future self believes the state file.

### F.3 When to go DEEP (earn the extra cost)

- **A guard fired** (budget / audit / test) — treat it as signal, not noise. A budget that hits 1KB
  under its limit is telling you to trim *now*.
- **A regression a cheap test can't see** — reach for a real audit (accessibility / performance /
  security), fix it, then **lock it with a structural test**.
- **A hard-to-reverse or outward-facing action** — git surgery with a human present, anything that
  publishes or sends — slow down and verify before acting.
- **A flagged security finding** — analyze the real exploit path *and the owner's intent* before
  fixing, so the fix is correct and non-disruptive.

### F.4 When to RESTRAIN (skip / defer / refuse)

- **Research contraindicates a feature** — kill it and *write down why*. A rejected feature is a
  successful research pass.
- **A feature carries disproportionate risk** (storage/quota, security, data loss) — defer it until
  you can do it *safely* (caps, quotas, guards). Don't ship it rough to look productive.
- **The gate is red but not from your change** — don't commit on top, and don't revert or guess at
  others' work. Wait, or commit only your isolated green delta.
- **A fix would require breaking a locked constraint** — don't override it unattended; surface it.

### F.5 Honest misses to design against

So the next reader avoids them — these are real mistakes from the run:

- **Fixing instances, not classes.** The same flaky-test shape recurred three times before it was
  hardened wholesale. When a *kind* of failure appears, fix the whole class that turn.
- **No up-front budget-raise policy.** "No budget rot" was asserted, then a justified bump came two
  phases later and had to be reconciled on the fly. Decide the policy before the budget fires.
- **Thrashing under live edits.** When a human edited the same tree, the protocol was re-derived
  under pressure. Pre-decide it (Part D) so the response is calm and fast.
- **Progress vs. *verified* progress.** The goal is green, verified increments. "Already done, moving
  on" and "tests still fail — here's the output" are *both* wins; faking motion is the only loss.

---

## Part G — Adapting to a new project: setup checklist

- [ ] Pick the **gate** — the cheapest checks that, all-green, mean "safe to continue" (typecheck + a
      smoke of the running app is the floor; add tests / build / budget / a11y as fits the stack).
- [ ] Define the **health check** and **restart commands** for your stack.
- [ ] Write **Research-Brief-v1** (rationale-first; small, ordered, independently-testable items; end
      with "when substantially done, author v2").
- [ ] Create `<repo>/.loop-state.json` (Part A.6 shape).
- [ ] Set the **fast wake-up** (~60s self-re-arm) and a **slow backstop** (~10–15 min heartbeat);
      pace per Part A.2.
- [ ] Choose **one clock** for timestamps; use it for both stamp and freshness compare.
- [ ] Declare **standing constraints**: secrets handling, dependency policy, external-work-respect,
      the budget-raise policy, and any known footguns.
- [ ] Confirm **auto-accept / bypass-permissions** is on so the loop isn't blocked on tool prompts.
- [ ] Kick off; thereafter re-send the same continuation prompt each turn (or let the wake-up do it).
- [ ] Say **"stop"** to end — then tear down per Part A.7.
