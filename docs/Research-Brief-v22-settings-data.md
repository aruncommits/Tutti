# Research Brief v22 — Settings & Your Data (export / reset)

*Status: active · continuous-enhancement · local-first transparency (Doc 1 P4, Doc 10 §8) · authored by the loop*

## Rationale — why this, now

Tutti keeps everything on the device — pace learning, ratings, saved meals, pantry, preferences —
and that local-first stance is a genuine strength. But the controls are scattered (Pro mode lives on
Home, learn-pace in Stats, pantry in Shopping) and there's **no way to see, export, or wipe your
data**. A local-first app should make that *more* transparent than the cloud apps, not less: one
Settings hub that groups the preferences in plain language and gives the user honest **"export
everything"** and **"reset everything"** controls. It's the natural consolidation as the app's
surface has grown, and it turns the privacy promise ("nothing leaves your device") into something the
user can actually exercise. Pure-ish, local, no network.

### Research findings folded in (web pass, June 2026)

- **Data controls must be discoverable, not buried** — easy access to download your data and to
  delete it; grouped settings with a clear visual hierarchy and plain-language labels (not jargon).
- **Export + delete are expected** ("download your data at any time"; automated/clear deletion).
  For Tutti that's a JSON dump of its `localStorage` keys (share/copy) and a wipe.
- **Opt-in, transparent** — say what each toggle does; reset is destructive so make it deliberate
  (a confirm step), and be honest that it can't be undone.

## Definition of done

A Settings screen (reachable from Home) groups the app's preferences (Pro mode, Learn my pace,
notification status) and a "Your data" section that states everything stays on the device, can
**export all data** (the `tutti.*` localStorage as JSON via share/clipboard), and can **reset
everything** behind a deliberate confirm; pure data helpers are unit-tested; gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure data helpers (web).** `apps/web/src/appData.ts`: `exportData(store: Pick<Storage, "length"|"key"|"getItem">):
   string` — collect every key starting with `"tutti."` into an object and `JSON.stringify` it
   (pretty). `tuttiKeys(store): string[]`. `resetData(store: Pick<Storage,"length"|"key"|"removeItem">):
   string[]` — remove every `tutti.*` key, return the removed keys. Take a storage-like param so it's
   unit-testable with a fake. Unit-test export captures only tutti.* keys; reset removes them and
   returns them.
2. **SettingsScreen (web).** Add `"settings"` to the Screen union; a lazy `SettingsScreen` (props:
   pro, onTogglePro, learnPace, onToggleLearn, onExport, onReset, onBack). Grouped sections:
   "Preferences" (Pro mode toggle + plain description; Learn my pace toggle) and "Your data"
   ("Everything stays on this device." + an Export button + a Reset-everything button that requires a
   second confirming tap, honest copy: "This erases all your saved meals, ratings, pace and
   settings. Can't be undone."). Lazy-load (perf budget).
3. **Wire (App).** Home gets a "Settings" link. App passes pro/learnPace + setters; onExport =
   shareOrCopy("Tutti data", exportData(localStorage)); onReset = resetData(localStorage) then reset
   in-memory state (simplest honest approach: clear + setScreen("home") + reload via location? avoid
   reload in tests — instead reset the key React states to defaults and go home). Keep it safe.
4. **Honest + safe.** Reset is two-step and clearly labeled; export plainly dumps local data; no
   network. Don't pretend success that didn't happen (reuse shareOrCopy's result).
5. **Tests.** appData unit tests (export only tutti.*; reset removes + returns them; ignores other
   keys). A SettingsScreen render test (toggles + data buttons present; reset needs the confirm tap
   before firing onReset).

## Enforce-what-you-build
- appData export/reset are pure over a storage interface + unit-tested (only tutti.* touched).
- SettingsScreen reset requires a confirm tap before onReset is called (tested).

## When substantially done
Run a web-research pass on the next gap (substitutions, photos, units toggle, onboarding, or another
competitor feature) and **author `docs/Research-Brief-v23-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://letket.com/privacy-first-design-ux-best-practices-2026/
- https://www.toptal.com/designers/ux/settings-ux
