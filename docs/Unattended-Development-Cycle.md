# The Unattended Development Cycle — a reusable playbook

A pattern for running Claude as a **continuous, self-pacing dev loop** on any project: it
wakes itself every ~60s, does one small green increment, writes its own next plan when a plan
is done, and never idles until you say "stop." This doc is app-agnostic — LearnEasy is just
the worked example. Copy the prompt templates below into any project to start your own loop.

---

## 1. The mental model

Three moving parts keep the loop alive and honest:

1. **The self-re-arming wake-up.** Every turn ends by scheduling the *next* turn (60s out) with
   the *same* continuation prompt. That's the heartbeat of the chain — miss it once and the
   loop dies. (Claude Code: `ScheduleWakeup`. Generic: any cron/timer that re-invokes the model
   with the prompt.)
2. **A durable state file** (`/.loop-state.json`) the loop stamps every turn — proof of life +
   a place to carry the iteration count and the "what's next" pointer across context windows.
3. **A backstop cron** (slower, e.g. every ~13 min) that only *checks* freshness and revives
   the fast chain if it stalled (e.g. a usage-limit window blocked the 60s wake-ups). This is
   the "heartbeat" prompt — it does nothing if the loop is alive.

The work itself is driven by a **research brief** — a committed `.md` plan in the repo. The
loop executes one brief in small increments; when the brief's items are done it **authors the
next brief itself** and keeps going. (Background research sub-agents proved unreliable for
this — author briefs inline.)

---

## 2. How to start a loop on a new app

Send Claude one **kickoff message** that contains everything the loop needs to re-derive its
job each turn (it must be self-contained — assume no memory between turns). The kickoff is just
the per-turn prompt (template in §3) plus a one-time setup instruction:

> Set up an unattended dev loop. Create `/.loop-state.json` with
> `{ "focus": "<theme>", "mode": "until-stop", "iteration": 0, "lastTick": "", "nextResearchTheme": "" }`,
> author `docs/Research-Brief-v1-*.md` (lead with rationale), then begin the loop below. [paste §3]

That's it. Every subsequent turn, you (or the wake-up) re-send the **same** continuation prompt
verbatim — the loop reads its state file + current brief and continues.

---

## 3. The per-turn continuation prompt (template)

Keep this stable and re-send it verbatim each turn. Fill the `<...>` slots.

```
Continue the UNATTENDED dev loop on <APP> (<repo path>). Standing directive: ACTIVE THEME = <theme>.
<Any standing constraints — e.g. external work in flight to adapt-not-revert; security/secrets rules; known footguns.>

GATE-FIRST each turn: confirm the app is up (<health check>) + typecheck clean; then build the
CURRENT brief in small plan→dev→test increments keeping the gate green (<list your gate checks>).

CURRENT PLAN: docs/Research-Brief-<vN>-*.md. <One-line of where it stands + the next concrete step.>

When the brief is substantially done: AUTHOR docs/Research-Brief-<vN+1> directly (inline, not via
a background agent) — lead with rationale. The loop never ends.

PER-TURN MECHANICS: if servers down, restart (<commands>). Stamp <repo>/.loop-state.json every turn —
write lastTick in LOCAL time via (Get-Date).ToString("o") + bump iteration. ALWAYS end the turn by
re-arming the 60s wake-up with this SAME prompt or the chain dies (the slow backstop cron is the only
safety net). AVOID big risky sweeps; incremental, keep green. Run until the user says "stop."
```

---

## 4. The heartbeat / revive prompt (slow backstop cron)

A separate, slower schedule fires this. It verifies freshness and only revives on a real stall:

```
HEARTBEAT — resilience backstop. Verify via timestamp FIRST, don't assume the fast loop is alive.
STEP 1: read /.loop-state.json. If (now - lastTick) < 10 min, reply exactly
  "heartbeat: loop alive (lastTick fresh)" and END — do nothing else (avoid double-running).
STEP 2 (only if lastTick missing or > 10 min): the fast chain stalled (likely a usage-limit window
  that has now reopened). Resume as if no break: confirm/restart servers, re-enter the loop on the
  CURRENT brief, stamp lastTick + bump iteration, and re-arm the fast 60s wake-up. Never stop unless
  the user said "stop".
```

---

## 5. The non-obvious lessons (hard-won)

- **Re-arm last, every time.** The single most important rule: the turn is not done until the
  next wake-up is scheduled. If you only do one thing, do that.
- **Timestamps: stamp in LOCAL time, compare in LOCAL time.** A subtle bug bit this loop —
  stamping `lastTick` in UTC (`...Z`) while the heartbeat compared against local `Get-Date`
  made a 2-min-old tick read as *hours* stale (by the local↔UTC offset), triggering false
  revives. Pick one clock for both stamp and compare. (`(Get-Date).ToString("o")` = local with
  offset.) Note PowerShell's `ConvertFrom-Json`/`ConvertTo-Json` round-trip re-localizes ISO
  strings — verify what actually lands on disk.
- **Gate-first catches external breakage.** If a human (or another tool) edits the repo between
  turns, the first thing each turn does — typecheck + smoke the running app — surfaces it before
  you build on a broken base. Adapt to their changes; don't revert their work.
- **Author the next plan inline.** Background "go research the next theme" sub-agents were
  unreliable (they'd stall or return thin results). Writing the next brief yourself — leading
  with *why this, now* — is faster and grounded in what you just built.
- **Keep increments small and the gate green.** One surface/fix per turn. A broken gate halts
  everything downstream; a big risky sweep is how an unattended loop wrecks a repo unsupervised.
- **Make the loop self-contained.** Each turn may start from a summarized/compacted context, so
  the prompt + state file + brief must carry everything. Don't rely on conversational memory.
- **A layered test gate is the seatbelt.** This loop runs four cheap, dependency-free checks
  every turn (typecheck + HTTP smoke + mutation flows + structural a11y). Cheap enough to run
  constantly, strong enough that "all green" genuinely means safe to continue.
- **Honesty over progress theater.** When an audit finds a surface already done, say "already
  done" and move on — don't rebuild it to look busy. The loop's value is real green increments.
- **Enforce what you build.** Each feature adds a tiny assertion to the gate (a served-HTML
  check, a label check) so a later turn can't silently regress it.

---

## 6. The state file (`/.loop-state.json`)

```json
{
  "focus": "<active theme>",
  "mode": "until-stop",
  "iteration": 341,
  "lastTick": "2026-06-17T21:52:10.1234567+08:00",
  "lastTickEpoch": 1781905930,
  "nextResearchTheme": "<vN status + the next brief's one-line pointer>"
}
```

`iteration` is a monotonic heartbeat counter; `lastTick`/`lastTickEpoch` are freshness; the
`nextResearchTheme` string is how the loop tells its future self what's done and what's next
when context has been compacted away.

---

## 7. Adapting to another app — checklist

- [ ] Pick the **gate**: the cheapest set of checks that, all-green, means "safe to continue"
      (typecheck + a smoke of the running app is the minimum; add flow/a11y/lint as fits).
- [ ] Define the **health check + restart commands** for your stack.
- [ ] Write **Research-Brief-v1** (lead with rationale; list small, ordered, independently
      testable items; end with "when substantially done, author v2").
- [ ] Create `/.loop-state.json`.
- [ ] Set the **fast wake-up** (~60s self-re-arm) and a **slow backstop** (~10–15 min heartbeat).
- [ ] Decide **one clock** for timestamps and use it for both stamp and freshness compare.
- [ ] State your **standing constraints** (secrets handling, external work to respect, footguns).
- [ ] Kick it off; thereafter re-send the same continuation prompt each turn (or let the
      wake-up do it). Say **"stop"** to end.
```
```
