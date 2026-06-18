# Research Brief v32 — Your Notes, Resurfaced at Cook Time

*Status: active · continuous-enhancement · closes the loop on Brief v17 notes · authored by the loop*

## Rationale — why this, now

Brief v17 lets you jot "more tamarind next time" and rate a dish, and shows that in Browse. But the
one moment a "next time" note is actually *actionable* is **next time — right before you cook it** —
and Tutti doesn't surface it there. The note sits in Browse, easy to forget, while you head straight
into the plan. Resurfacing each dish's saved note on the **"Get ready" (mise) screen** (and, lightly,
the plan preview) means the lesson you wrote last time reaches you at exactly the point you can act on
it: as you gather and prep. That's the textbook contextual-reminder principle from the research —
"remember the right thing at the right moment, not when a timer goes off." It's tiny, pure, reuses the
notes data we already store, and turns a captured-but-buried note into a real feedback loop.

### Research findings folded in (web pass, June 2026)

- The value of a note/reminder is **recovering the detail at the moment it matters**, surfaced by
  *context/behavior* (you're about to cook this dish) not a schedule. A "last time" note shown before
  committing helps the cook make better decisions and cuts cognitive load.
- Keep it a quiet, glanceable nudge — not a modal, not a nag; only shown when a note exists.

## Definition of done

When a meal includes a dish you've left a note on, the "Get ready" screen shows that note ("Last time:
…") for each such dish, with its star rating if any; nothing shows for dishes without a note; reuses
the existing `tutti.recipeNotes`; gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pass notes to mise (App).** Thread the existing `notes: NotesMap` into `MiseScreen` (App already
   holds it). No new state.
2. **"Last time" block (MiseScreen).** At the top of the Get-ready screen, for each recipe in the meal
   that has `notes[recipeId]?.note` (or a rating), render a quiet reminders section: per dish, the dish
   name + ★rating (read-only `Stars`) + the note text ("Last time: …"). Use `dishName`/recipe name +
   `colorFor` dot for identity. Skip dishes with no note/rating. Keep it subtle (muted card), above
   the Gather list.
3. **(Optional) Preview echo.** If cheap, show a one-line "you have notes on N of these dishes" hint
   on PreviewScreen — but keep the primary surface mise. Don't over-build.
4. **Honest + quiet.** Only renders when there's a real note/rating; never fabricated; not a blocker.
5. **Tests.** A MiseScreen test: given `notes={{ rec_x: { note: "more tamarind", rating: 4, cookCount: 2 } }}`
   and a meal containing rec_x, the "last time"/note text + stars render; with empty notes, no
   reminders block appears.

## Enforce-what-you-build
- a MiseScreen test that a dish with a saved note shows it (and an empty notes map shows nothing).
- pure/derived rendering; gate (incl. perf-check, no deps) stays green.

## When substantially done
Run a web-research pass on the next gap (photos, onboarding, temperature, or competitor feature) and
**author `docs/Research-Brief-v33-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://memorychat.app/en/blog/best-notes-app-with-reminders/
- https://www.appcues.com/blog/in-app-notifications
- https://blog.tubikstudio.com/case-study-recipes-app-ux-design/
