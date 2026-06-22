# 12 — Menu Import V2

## Overview

Menu Import lets users build their personal recipe library from menus they already have — restaurant menus, printed event menus, meal-kit cards, hand-written lists. Rather than typing recipes from scratch, the user pastes or uploads a menu; the engine matches dishes to the existing catalog and AI-generates the rest. The result lands in the personal library immediately, ready to add to a cook plan. Phase 1 (text paste) is shipped. Phase 2 adds PDF and photo/camera inputs feeding the same parse pipeline. Phase 3 adds a community-share pathway gated behind OAuth.

## Current State

**Shipped (Phase 1, feat/menu-import branch, PR #2 open):**

- `apps/web/src/screens/MenuImportScreen.tsx` — main screen with a single text input mode
- `packages/ingest/src/menu.ts` — `parseMenu(text)` parses raw text into a list of dish name strings
- `packages/ingest/src/match.ts` — `isLikelyMatch()` uses Jaccard similarity (threshold ≥ 0.6) against `library.searchDishes()` results
- Per-dish row UI with status states: `searching` → `matched` | `miss`; from `miss` → `adding` → `added` | `error`
- "✨ Generate" button on miss rows calls `askAiForRecipe()` → `PasteParser` → `compileRecipe()` → `saveToLibrary()` (candidates + IndexedDB)
- No auto-navigation after save; user must leave the screen manually
- 41 + 4 ingest tests green covering `parseMenu` and `isLikelyMatch`

**Not yet built:**
- PDF extraction
- Photo/camera OCR
- Community share CTA
- Progress feedback for slow operations beyond per-row spinners

## Problem

From a real user's perspective:

1. **Menus rarely arrive as plain text.** Restaurant menus are PDFs. Event programs are photos. Meal-kit inserts are scanned images. The text tab handles only the manually-typed or copy-pasted case, which is the minority.
2. **The import entry point is buried.** MenuImport lives inside Studio behind a button. Users who want to batch-populate their library from a restaurant trip must discover Studio first, then the import sub-option — two unintuitive hops from the Home screen.
3. **No progress feedback for OCR.** If photo import existed today and took 8 seconds, the user would see nothing. Tesseract.js has a progress callback but nothing surfaces it.
4. **Generated recipes don't invite sharing.** A user who imports a boutique restaurant menu and AI-generates 6 recipes has done curation work that benefits every other user. There is no path to contribute it back.
5. **File safety is not enforced.** A user could attempt to upload a 200 MB PDF. No client-side guard exists yet.
6. **Matched-but-wrong results are silent.** Jaccard ≥ 0.6 will occasionally match "Lamb Rogan Josh" to "Lamb Chops" with no way for the user to reject the match and force a generate.

## V2 Design

**Phase 2 — PDF and photo inputs:**

Three input modes are presented as tabs at the top of `MenuImportScreen`: `Text | PDF | Photo`. Switching tabs resets the parse results list so prior results do not bleed into a new import session. PDF and photo both extract text client-side and hand that text to the existing `parseMenu()` pipeline — no new parse logic, no new server call.

PDF uses `pdfjs-dist` loaded via `dynamic import()` so the ~1 MB worker bundle is not part of the initial app chunk. Photo uses `tesseract.js` loaded the same way. Both libraries are lazy; the import fires only when the user selects that tab and initiates a file pick or camera capture.

Camera capture uses `<input type="file" accept="image/*" capture="environment">` for mobile and falls back to standard file picker on desktop. File size is validated client-side before any library is loaded: > 10 MB shows an inline error and aborts — no spinner, no network request.

OCR progress is surfaced via tesseract.js's `logger` callback, which emits `{ status, progress }`. A determinate progress bar replaces the placeholder state while recognition runs, labeled "Reading your photo…". When `status === 'recognizing text'` the bar fills from 0 → 100 %. On completion the extracted text is passed to `parseMenu()` and the standard per-dish row list renders.

**Match rejection (new in Phase 2):**

Each matched-dish row gains a small "Wrong match?" link. Tapping it demotes the row from `matched` to `miss`, clearing the matched recipe reference, and shows the "✨ Generate" button. This lets the user override a false positive without re-importing.

**Phase 3 — Community share (spec only, gated on OAuth):**

After a generated recipe reaches `added` status, its row shows a secondary CTA: "Share with the community?". Tapping it requires OAuth sign-in (GitHub or Google). If the user is already authenticated the recipe is submitted to a moderation queue via `POST /api/library/recipe`. If not, an auth modal opens first. Full Phase 3 spec is in doc 30.

**Navigation:**

MenuImport is accessed from Studio (unchanged). After a full import session the user can tap "Done" to return to Studio, or "Go to Library" to open Studio with the personal-recipes tab in focus. No auto-navigation on individual row saves — the user controls when they are finished.

## Spec

### Component tree

```
MenuImportScreen
├── ImportModeTabBar          (Text | PDF | Photo)
├── TextInputPanel            (textarea + "Parse" button)          [Text tab]
├── FileInputPanel            (file picker or camera button)       [PDF | Photo tab]
│   ├── FileSizeGuard         (inline error if > 10 MB)
│   └── ExtractionProgress    (progress bar + label)              [Photo only]
├── DishResultsList
│   └── DishResultRow[]
│       ├── StatusBadge       (searching | matched | miss | adding | added | error)
│       ├── MatchedRecipeChip (recipe name + "Wrong match?" link)  [matched only]
│       ├── GenerateButton    ("✨ Generate")                      [miss only]
│       └── ShareCTA          ("Share with community?")           [added + OAuth gate]
└── SessionFooter             ("Done" | "Go to Library")
```

### State

```typescript
type ImportMode = 'text' | 'pdf' | 'photo';

type DishRowStatus =
  | 'searching'
  | 'matched'
  | 'miss'
  | 'adding'
  | 'added'
  | 'error';

interface DishRow {
  id: string;              // stable key, e.g. slugified dish name
  rawName: string;         // as parsed from menu text
  status: DishRowStatus;
  matchedRecipe?: RecipeGraph;
  generatedRecipe?: RecipeGraph;
  errorMessage?: string;
  shareStatus?: 'idle' | 'pending' | 'submitted' | 'error';
}

interface MenuImportState {
  mode: ImportMode;
  rawText: string;         // text tab content
  file: File | null;       // pdf or photo tab
  extractedText: string;   // output of pdfjs or tesseract
  ocrProgress: number;     // 0–1, photo only
  ocrStatus: string;       // tesseract status label
  rows: DishRow[];
  sessionComplete: boolean;
}
```

### PDF extraction

```typescript
async function extractTextFromPdf(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'; // copied to public/ via vite plugin
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then(p => p.getTextContent())
    )
  );
  return pages
    .flatMap(p => p.items)
    .map((item: any) => item.str)
    .join('\n');
}
```

The extracted string is passed directly to `parseMenu(extractedText)`. No intermediate state is shown to the user; the progress bar advances through extraction, then row results appear.

### OCR extraction

```typescript
async function extractTextFromImage(
  file: File,
  onProgress: (p: number, status: string) => void
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      onProgress(m.progress, m.status);
    },
  });
  const { data } = await worker.recognize(file);
  await worker.terminate();
  return data.text;
}
```

`onProgress` updates `ocrProgress` and `ocrStatus` in component state, driving the `ExtractionProgress` bar.

### File validation

Enforced before any async library load:

```typescript
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateFile(file: File, mode: 'pdf' | 'photo'): string | null {
  if (file.size > MAX_FILE_BYTES) return 'File must be under 10 MB.';
  if (mode === 'pdf' && file.type !== 'application/pdf')
    return 'Please select a PDF file.';
  if (mode === 'photo' && !file.type.startsWith('image/'))
    return 'Please select an image file.';
  return null;
}
```

### Match rejection

`DishResultRow` exposes an optional `onRejectMatch` callback. When called it dispatches:

```typescript
dispatch({ type: 'REJECT_MATCH', id: row.id });
// reducer: sets status → 'miss', clears matchedRecipe
```

The "Wrong match?" link renders only when `status === 'matched'`. It is styled as a small secondary text link (not a button) to keep visual weight low.

### ImportModeTabBar

Three tab items rendered as `<button role="tab" aria-selected>`. Switching mode:
- Sets `mode` in state
- Clears `rows`, `rawText`, `file`, `extractedText`, `ocrProgress`
- Does NOT unmount child panels — tabs use CSS `display: none` rather than conditional rendering to preserve file input state across accidental tab switches

### CSS classes (existing Tutti conventions)

- `.import-mode-tabs` — tab bar container
- `.import-mode-tab` — individual tab button; `.import-mode-tab--active` modifier
- `.extraction-progress` — progress bar wrapper
- `.extraction-progress__bar` — inner fill, width driven by `ocrProgress * 100 + '%'`
- `.dish-row` — single result row
- `.dish-row__status` — badge; modifier per status (`.dish-row__status--matched`, etc.)
- `.dish-row__reject-link` — "Wrong match?" inline link
- `.dish-row__share-cta` — Phase 3 share button; hidden until `status === 'added'`

### Build configuration

- `pdfjs-dist` added to `apps/web/package.json` dependencies (not devDependencies)
- PDF worker copied to `apps/web/public/pdf.worker.min.js` via `vite-plugin-static-copy` or a `postinstall` script
- `tesseract.js` added to `apps/web/package.json` dependencies
- Both packages excluded from the main bundle via Vite `build.rollupOptions.external` — they load only via `import()`
- Add `pdfjs-dist` and `tesseract.js` type stubs to `tsconfig.json` if `@types` packages are absent

### Edge cases

| Case | Handling |
|---|---|
| PDF with no selectable text (scanned) | `extractTextFromPdf` returns empty string → `parseMenu('')` returns `[]` → show "No dishes found. Try the Photo tab." |
| Image too dark / blurry | Tesseract returns low-confidence text → `parseMenu` may return few/no rows → same "No dishes found" message |
| User switches tab mid-OCR | Cancel pending worker: store worker ref in a `useRef`, call `worker.terminate()` in cleanup effect |
| AI generate fails | Row stays `miss`, `errorMessage` set, "Retry" link appears next to "✨ Generate" |
| All rows `added` | `sessionComplete` set to `true`, footer highlights "Go to Library" in primary color |
| Duplicate import (same menu twice) | `saveToLibrary` deduplication (by `recipeId`) already handled in Phase 1 engine; rows show `added` immediately on re-import |
| PDF > 50 pages | `extractTextFromPdf` caps at 50 pages with a warning banner: "Showing first 50 pages." |

## Data & Dependencies

**Reads:**
- `library.searchDishes(query)` — personal + server catalog search (unchanged from Phase 1)
- `isLikelyMatch(candidate, query)` — `packages/ingest/src/match.ts`
- `parseMenu(text)` — `packages/ingest/src/menu.ts`

**Writes:**
- `saveToLibrary(recipe)` — candidates (localStorage `tutti.candidates`) + IndexedDB `recipeStore` (unchanged from Phase 1)
- Phase 3 only: `POST /api/library/recipe` — moderation queue submission (see doc 30)

**External packages (new in Phase 2):**
- `pdfjs-dist` ^4.x — PDF text extraction (lazy)
- `tesseract.js` ^5.x — OCR (lazy)

**Screens that open MenuImport:**
- `StudioScreen` → "Import Menu" button → `setScreen('menuImport')`
- Return: `prevScreen` tracking already in `App.tsx`; back arrow returns to Studio

**Screens touched by imported recipes:**
- `StudioScreen` personal-recipes tab — newly saved recipes appear here
- `HomeScreen` dish picker — newly saved recipes appear in search results
- `BrowseScreen` — personal recipes do not appear here (server catalog only)

**OAuth dependency (Phase 3):**
- GitHub / Google OAuth flow, auth state in user context
- `POST /api/library/recipe` write endpoint
- Moderation queue (backend, out of scope for this doc — see doc 30)
