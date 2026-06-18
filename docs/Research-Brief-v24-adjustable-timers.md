# Research Brief v24 — Adjustable Cook Timers (+ a few minutes)

*Status: active · continuous-enhancement · Doc 7 Cook Mode (passive timers) + Brief v15 alerts · authored by the loop*

## Rationale — why this, now

Tutti's passive timers (the simmer, the rice, the bake) count down from the *planned* duration — but
real cooking isn't that precise. The rasam needs three more minutes; the rice wants a touch longer.
Right now the cook can only mark it Done or watch it hit zero; there's no way to say "give it a few
more minutes," so the honest options are overcook or fib to the app. Every dedicated kitchen timer
solves this with **quick add-time buttons on a running timer** ("+1 min / +5 min"). Adding that to
the passive cards — and re-arming the "ready" alert (Brief v15) at the new zero — closes a small but
constant gap in the core cooking loop, and keeps the on-screen state honest to what's actually
happening on the stove. Pure, local, no new deps.

### Research findings folded in (web pass, June 2026)

- The universal pattern is **add/extend time while the timer runs** — quick "+1 min" (and often
  "+5 min") buttons, sometimes via long-press, to "minimize the risk of overcooking."
- Custom/flexible increments ("+10min/+1min/+10sec") are common; keep Tutti's to a tasteful **+1m /
  +5m** (glanceable, big targets) — not a full numeric pad.
- It should work both **while counting down** and **after it hit zero** (the cook glances late and
  wants a few more minutes without restarting the whole task).

## Definition of done

On a started passive task, the cook can add +1m / +5m to the countdown (before or after it reaches
zero); the displayed remaining time updates, and the "ready" notification (Brief v15) re-fires at the
new zero (the one-shot guard resets on extend); the on-screen ✓ Done + "⏲ ready!" fallback stays
unchanged; the timer math is pure + unit-tested; gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure timer helper (web).** `apps/web/src/timer.ts`: `extendRemaining(remaining: Record<string,
   number>, id: string, addSec: number): Record<string, number>` — returns a new map with
   `max(0, (remaining[id] ?? 0) + addSec)` for `id` (immutable; only that key changes; if the id
   isn't present, treat as 0 → addSec). `mmssClamp`/format already exists in CookScreen. Unit-test:
   adds seconds immutably; floors at 0; seeds from 0 when absent.
2. **+1m / +5m on passive cards (CookScreen).** In the started-passive branch (where the ⏲ label +
   Done render), add two small buttons "+1m" and "+5m" that call `setRemaining((r) =>
   extendRemaining(r, id, 60|300))` AND clear the just-notified guard for that id (delete from the
   notifiedRef set) so the ready alert re-fires at the new zero. Keep them compact, ≥40px, with
   aria-labels ("Add 1 minute to <task>"). Works whether ticking > 0 or === 0.
3. **Re-arm the alert.** Ensure extending past zero re-arms Brief v15's notification (remove the id
   from `notifiedRef.current`), so "<dish> is ready" fires again when the extended time elapses.
4. **Honest + unobtrusive.** Only on started passive tasks; active hands-on tasks are unchanged; the
   big Done and the "⏲ ready!" label remain. No timer for tasks the cook hasn't started.
5. **Tests.** timer.ts unit tests (extend immutably, floor at 0, seed-from-absent). A CookScreen test
   (a started passive task — drive it via a plan + start — exposes +1m/+5m controls; clicking +1m
   doesn't throw and the control is labelled). Keep the cook gate green.

## Enforce-what-you-build
- `extendRemaining` is pure + unit-tested (immutability, floor-at-0, seed-from-absent).
- the +1m/+5m controls render only for started passive tasks (active tasks unaffected).

## When substantially done
Run a web-research pass on the next gap (substitutions, photos, units toggle, onboarding, or another
competitor feature) and **author `docs/Research-Brief-v25-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://apps.apple.com/gb/app/timer-timers-and-stopwatches/id391564049
- https://play.google.com/store/apps/details?id=com.maxxt.kitchentimer
