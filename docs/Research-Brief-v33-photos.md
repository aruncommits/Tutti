# Research Brief v33 — Finished-Dish Photos

*Status: active · continuous-enhancement · competitor parity (visual cookbook) · authored by the loop*

## Rationale — why this, now

A photo of the dish you actually made is the most satisfying thing a recipe keeper holds — it turns
Tutti's library from text into *your* cookbook and helps you recognise a meal at a glance ("oh, the
golden one we loved"). It's a near-universal feature (Paprika, AnyList, CookBook) and the natural
companion to the ratings/notes already captured at the finale (v17). The risk is storage: localStorage
is ~5 MB and base64 bloats. We neutralise that by **resizing to a tiny thumbnail** (~160 px JPEG,
well under 20 KB) on capture, storing a **capped** map keyed by recipe, with **quota-safe** writes —
so it's additive and can't break the resilient-persistence guarantees (Brief v23). Captured at the
"Dinner is served" finale, shown wherever the dish appears.

### Research findings folded in (web pass, June 2026)

- **Resize client-side via `<canvas>` → `toDataURL("image/jpeg", ~0.7)`**; aim **< 20 KB** for a
  thumbnail. base64 is larger than a Blob but fine at thumbnail size.
- Capture with `<input type="file" accept="image/*" capture="environment">` (opens the camera on
  mobile, file picker on desktop). Always **guard storage writes** (quota can throw) and cap the
  number kept.

## Definition of done

At the finale the cook can add a photo for a just-cooked dish; it's resized to a small thumbnail and
stored (capped, quota-safe) in `tutti.photos`; the thumbnail then shows in Recipe detail, the "Last
time" block, and Browse; removable; nothing breaks if the camera/canvas is unavailable; gate green
(no new deps, perf budget intact).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure store + guarded resize (web).** `apps/web/src/photos.ts`: `type Photos = Record<string,
   string>` (recipeId → data URL). Pure `addPhoto(map, id, dataUrl, cap = 12)` (immutable; set id;
   if over cap, drop the oldest *other* key — keep it simple/deterministic), `removePhoto(map, id)`.
   Plus `resizeToThumb(file: File, max = 160): Promise<string>` — feature-detected: load the file into
   an `Image`, draw onto a `<canvas>` scaled so the longest side ≤ max, return
   `canvas.toDataURL("image/jpeg", 0.7)`; reject if `document`/canvas unavailable (jsdom). Unit-test
   the PURE map helpers (add/replace/cap/remove, immutability); note resize is browser-only.
2. **Persist + capture at the finale (App + CookScreen).** App `usePersistentState<Photos>("tutti.photos",
   {}, isPlainObject)`; pass `photos` + an `onPhoto(id, file)` handler that does
   `resizeToThumb(file).then(url => setPhotos(p => addPhoto(p, id, url))).catch(() => {})` wrapped so a
   quota error on the persist is swallowed. In the CookScreen finale review row, add a "📷 Add photo"
   `<label>`+hidden `<input type="file" accept="image/*" capture="environment">` (only when `onPhoto`
   given) and, if a photo exists, show the thumbnail with a remove (×).
3. **Show the thumbnail where the dish appears.** Pass `photos` to RecipeDetailScreen (header
   thumbnail), the Mise "Last time" block, and BrowseScreen rows — small rounded `<img>` when
   `photos[recipeId]` exists. Honest: nothing shows without a photo.
4. **Safe + quota-aware.** Wrap the photos `setItem` (it already goes through `usePersistentState`’s
   try/catch — confirm a huge value can’t crash the app); cap kept photos; resize failures are no-ops.
5. **Tests.** photos.ts unit tests (add/replace, cap drops oldest, remove, immutability). A
   RecipeDetail/Browse test that a `photos` entry renders an `<img>` and absence renders none.
   (Camera capture + canvas resize are browser-only — verify in-browser, note jsdom can't.)

## Enforce-what-you-build
- photos.ts map helpers pure + unit-tested (cap + immutability — the storage-safety logic).
- a screen test that a stored photo renders an img; gate (perf/pwa, no deps) stays green.

## When substantially done
Run a web-research pass on the next gap (onboarding, temperature, or competitor feature) and **author
`docs/Research-Brief-v34-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://jstrieb.github.io/posts/canvas-compress/
- https://dev.to/shaishav_patel_271fdcd61a/building-a-browser-side-image-compressor-with-canvas-api-quality-presets-webp-conversion-and-3nne
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL
