# 29 — AI Features

## Overview

Tutti's AI integration provides on-demand recipe generation without requiring users to write structured recipe data manually. All AI calls are routed through the Tutti server (never browser-to-provider directly), keeping API keys server-side and allowing the app to work offline for non-AI features. The AI surface is deliberately narrow: generate a recipe from a text prompt. This one capability unlocks two user-facing flows — the "Ask AI" tab in AddRecipeScreen and the "generate miss" path in MenuImportScreen — plus a third planned flow for URL-based import.

## Current State

Server endpoint: `apps/web/server/api/aiPlugin.ts` and `apps/web/server/api/aiRouter.ts`
- Route: `POST /api/recipe`
- Accepts: `{ prompt?: string, url?: string }` (exactly one of the two)
- Returns: raw recipe text (not parsed JSON)
- AI provider selected at runtime by which key is present in `apps/web/.env`: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- When neither key is set: returns HTTP 501 with body `"AI not configured"`

Client-side surfaces:
1. `AddRecipeScreen` — "Ask AI" tab: user types a natural-language description, the client POSTs to `/api/recipe`, the returned text is fed to `PasteParser`, and the parsed recipe is saved to the personal library (IndexedDB + `tutti.candidates`).
2. `MenuImportScreen` — `askAiForRecipe(dish, restaurantStyle?)` is called for each dish that failed a library match. Constructs prompt `"Write a recipe for '${dish}'"`, POSTs, receives text, runs it through `PasteParser` → `compileRecipe()` → `saveToLibrary()`.
3. URL import: the `url` field is wired in the server route but the client-side flow is not yet built (Phase 3 future).

No quota limiting is enforced in application code. Cost control is delegated to the operator's API key spend limits on the provider dashboard.

## Problem

From a real user's perspective:
- When an API key is not configured, the UI silently fails or shows a cryptic error rather than a clear explanation of what is missing and how to fix it.
- There is no loading or progress feedback during generation — recipes take 2–5 seconds and the screen goes quiet.
- If the AI returns malformed text that PasteParser cannot parse, the error surfaces as a generic crash rather than a specific "generation failed" message with a retry path.
- The prompt sent for menu-import misses (`"Write a recipe for 'X'"`) is minimal and produces inconsistent step structure. There is no restaurant-style conditioning in the prompt when `restaurantStyle` is provided.
- Users have no visibility into whether their instance has AI enabled before they try to use it, leading to a dead-end in the middle of a flow.

## V2 Design

**Unified AI client module.** Extract all AI-calling logic into a single `apps/web/src/ai/generateRecipe.ts` function with the signature `generateRecipe(input: { prompt: string } | { url: string }): Promise<RecipeGraph>`. This function owns the fetch, error classification, PasteParser call, and compileRecipe call. Both AddRecipeScreen and MenuImportScreen call this one function.

**Clear error states.** The function throws typed errors: `AiNotConfiguredError`, `AiGenerationError`, `AiParseError`. Each UI surface catches and renders a specific message:
- `AiNotConfiguredError` → "AI is not enabled on this server. Add an API key in `apps/web/.env` to use this feature."
- `AiGenerationError` → "Recipe generation failed. Check your API key and try again." with a Retry button.
- `AiParseError` → "AI returned a recipe we couldn't parse. Try rephrasing your request." with the raw text collapsed in a `<details>` block for debugging.

**AI availability indicator.** On app load, a lightweight probe (`GET /api/recipe/status`) returns `{ configured: boolean }`. This is stored in a React context (`AiContext`). Surfaces that require AI show a capability chip ("AI enabled" / "AI not available") so the user knows before they try.

**Prompt quality improvements.**
- AddRecipeScreen: the user's raw text is sent verbatim but wrapped: `"Write a complete step-by-step recipe for: ${userText}. Format as plain text with ingredients list followed by numbered steps."` This produces consistently parseable output.
- MenuImportScreen: when `restaurantStyle` is present, the prompt becomes: `"Write a home-cook version of '${dish}' in the style of ${restaurantStyle} cuisine. Format as plain text with ingredients list followed by numbered steps."` When absent, the prompt is: `"Write a home-cook recipe for '${dish}'. Format as plain text with ingredients list followed by numbered steps."`

**Progress feedback.** Both surfaces show a skeleton card with an animated pulse while generation is in flight, replacing the input form. The skeleton has three blocks: title line, ingredient list shape, steps list shape. Generation time is typically 2–5 seconds; no timeout is imposed on the client but the server passes through whatever the provider's timeout is (OpenAI default 10 s, Anthropic default 60 s).

**Cost transparency (operator-facing).** The server logs each generation call with `console.info('[ai] generated', { model, inputTokens, outputTokens, estimatedCost })` using the token counts returned by the provider response. No user-facing cost display — this is operator tooling.

## Spec

**New file: `apps/web/src/ai/generateRecipe.ts`**
```
export class AiNotConfiguredError extends Error {}
export class AiGenerationError extends Error {}
export class AiParseError extends Error { rawText: string }

export async function generateRecipe(
  input: { prompt: string } | { url: string }
): Promise<RecipeGraph>
```
- Calls `fetch('/api/recipe', { method: 'POST', body: JSON.stringify(input) })`
- 501 → throws `AiNotConfiguredError`
- 4xx/5xx → throws `AiGenerationError`
- On 200: passes `response.text()` to `PasteParser.parse()`
- If parse returns null/empty nodes → throws `AiParseError` with `rawText`
- Otherwise calls `compileRecipe(parsed)` and returns the `RecipeGraph`

**New file: `apps/web/src/ai/AiContext.tsx`**
```
export const AiContext = React.createContext<{ configured: boolean | null }>({ configured: null })
```
- Provider wraps App, fetches `GET /api/recipe/status` once on mount
- `configured: null` = loading; `true` = ready; `false` = unavailable

**New server route: `GET /api/recipe/status`** in `aiRouter.ts`
- Returns `200 { configured: true }` if either key is set, else `200 { configured: false }`
- Never returns 501 — this route always responds so the client can render capability state

**AddRecipeScreen changes** (`apps/web/src/screens/AddRecipeScreen.tsx`)
- "Ask AI" tab reads `AiContext` — if `configured === false`, replaces the textarea with a banner: "AI is not enabled. Configure an API key to use this feature."
- If `configured === null`, shows a spinner placeholder
- On submit: sets `status = 'generating'`, renders skeleton, calls `generateRecipe({ prompt })`, on success transitions to recipe edit view pre-populated with the graph, on error sets `status = 'error'` with the typed error message

**MenuImportScreen changes** (`apps/web/src/screens/MenuImportScreen.tsx`)
- `askAiForRecipe` is replaced by `generateRecipe({ prompt: buildMenuPrompt(dish, restaurantStyle) })`
- `buildMenuPrompt(dish, style?)` lives in `apps/web/src/ai/prompts.ts`
- Per-dish generation shows a row-level spinner; errors per dish show a "Retry" icon button rather than failing the entire import

**Server: `aiRouter.ts` additions**
- Add `GET /recipe/status` handler before the existing `POST /recipe` handler
- Existing `POST /recipe` unchanged in contract; add server-side logging of token usage after provider response

**Environment variables** (no change to names):
- `OPENAI_API_KEY` — if set, uses OpenAI; model default `gpt-4o-mini`
- `ANTHROPIC_API_KEY` — if set and OpenAI not set, uses Anthropic; model default `claude-haiku-3-5`
- Both set: OpenAI takes precedence

**Edge cases:**
- User submits empty prompt → client-side validation, never reaches server
- Provider returns a valid recipe but with 0 steps → `AiParseError` (compileRecipe produces empty nodes)
- Network offline → fetch throws, caught as `AiGenerationError` with message "Could not reach server"
- Very long prompt (>500 chars) → no client truncation; server passes through; provider handles context limits

## Data & Dependencies

- Reads: none (AI is generative, not data-read)
- Writes: generated `RecipeGraph` → `saveToLibrary()` → IndexedDB `recipeStore` + `localStorage` `tutti.candidates`
- Touches: `AddRecipeScreen`, `MenuImportScreen`, `PasteParser` (`packages/engine/src/pasteParser.ts`), `compileRecipe` (`packages/engine/src/compiler.ts`)
- Server files: `apps/web/server/api/aiPlugin.ts`, `apps/web/server/api/aiRouter.ts`, `apps/web/.env`
- No Supabase dependency — AI generation is fully server-keyed, not user-auth-gated in V1/V2

---

# 30 — Public Library Phase 3

## Overview

Phase 3 completes the community loop: a user who imports or generates a recipe can submit it to the public catalog, where it enters a moderation queue and, once approved, becomes a verified recipe visible to all Tutti users. This closes the gap between the personal library (private, unverified) and the server library (public, verified). The architecture is intentionally lightweight — OAuth for identity, two new database tables, three new API routes, and a minimal admin UI — because the primary constraint is moderation throughput, not submission volume.

## Current State

No submission infrastructure exists. The Supabase `recipes` table has a `verified` boolean column (set to `true` for all 600 catalog recipes). Personal library recipes live in IndexedDB and never touch Supabase. There is no user identity layer — the app is entirely anonymous. The server (`apps/web/server/server.mts`) has no OAuth routes. There is no admin UI.

Menu import (Phase 1, shipped) already generates recipes via AI and saves them to the personal library. Phase 2 (OCR) and Phase 3 (OAuth + moderation) are pending. This document specifies Phase 3.

## Problem

From a real user's perspective:
- A user who has a high-quality personal recipe — either hand-crafted or AI-generated and edited — has no way to contribute it to the app's catalog so other users benefit.
- The app has no identity layer, so there is no accountability for submissions and no way to credit contributors.
- Moderators (currently just the app operator) have no tooling to review submissions; approval would require direct database writes.
- Without a moderation gate, any submitted content would go directly public, which is untenable at scale.

## V2 Design

**Identity via OAuth (server-side only).** Users authenticate with GitHub or Google. The OAuth flow is server-side (authorization code flow): the browser redirects to the provider, the provider redirects back to the Tutti server, the server exchanges the code for a token, fetches the user profile, upserts a `users` row, sets a signed session cookie (HttpOnly, SameSite=Strict), and redirects the browser to the client app. No OAuth library dependency — the flow is implemented directly in `apps/web/server/auth/oauthRouter.ts` using `node:crypto` for state parameter validation.

**Session management.** The server signs session cookies with `SESSION_SECRET` (env var). Session payload: `{ userId: string, email: string, exp: number }`. Sessions expire after 30 days. The client learns the current user by calling `GET /api/me` which returns `{ userId, email } | null`. The client does not store tokens — only the HttpOnly cookie.

**Submission flow is opt-in, post-save.** After a recipe is saved to the personal library (either via AI generation or manual entry), a CTA appears: "Share with the community?" If the user is not logged in, tapping it starts the OAuth flow (a modal explains what it does before redirecting). After OAuth completes, the user is returned to the recipe, and the CTA becomes active. Tapping "Submit" calls `POST /api/library/recipe` with the recipe JSON. A success banner: "Submitted for review. We'll add it to the catalog if it meets our quality bar."

**Moderation admin UI.** A React route at `/admin` (protected by a `role: 'admin'` check in the session) lists all pending submissions in a table. Each row shows: recipe name, submitter email, submitted_at, a "Preview" button (opens a read-only recipe view), and "Approve" / "Reject" buttons. Approve writes the recipe to the Supabase `recipes` table with `verified = true` and updates the submission status. Reject updates status to `rejected` with an optional reason. The admin role is assigned by setting `admin_email` in server environment variables — any authenticated user whose email matches gets the `admin` role in their session.

**No email notifications in Phase 3.** Notification of approval/rejection is deferred. The user can check submission status via `GET /api/library/submissions/mine` which returns their submissions with current status.

## Spec

**New Supabase tables:**

`users`
```
id          uuid primary key default gen_random_uuid()
email       text not null unique
github_id   text unique
google_id   text unique
created_at  timestamptz default now()
```

`submissions`
```
id              uuid primary key default gen_random_uuid()
recipe_json     jsonb not null
submitted_by    uuid references users(id)
status          text not null default 'pending'  -- pending | approved | rejected
reviewed_by     uuid references users(id)
reviewed_at     timestamptz
reject_reason   text
created_at      timestamptz default now()
```

**New server routes** (all in `apps/web/server/`):

`auth/oauthRouter.ts`
- `GET /auth/github` → redirect to GitHub OAuth with state param
- `GET /auth/github/callback` → exchange code, upsert `users`, set session cookie, redirect to `/`
- `GET /auth/google` → redirect to Google OAuth with state param
- `GET /auth/google/callback` → exchange code, upsert `users`, set session cookie, redirect to `/`
- `GET /auth/logout` → clear session cookie, redirect to `/`
- `GET /api/me` → return `{ userId, email }` from session or `null`

`api/libraryRouter.ts` additions (file already exists for `/api/library/*`):
- `POST /api/library/recipe` — requires session; body: `{ recipe: RecipeGraph }`; inserts into `submissions`; returns `{ submissionId }`
- `GET /api/library/submissions/mine` — requires session; returns array of `{ submissionId, recipeName, status, createdAt }`
- `GET /api/library/submissions` — requires admin session; returns all pending submissions with user email
- `PATCH /api/library/submissions/:id` — requires admin session; body: `{ action: 'approve' | 'reject', reason?: string }`; on approve: inserts recipe into `recipes` table with `verified = true`, updates submission status; on reject: updates status + reason

**New environment variables** in `apps/web/.env`:
```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SESSION_SECRET=          # random 32-byte hex string
ADMIN_EMAIL=             # comma-separated list of admin emails
```

**Client changes:**

New file: `apps/web/src/auth/AuthContext.tsx`
```
export const AuthContext = React.createContext<{
  user: { userId: string; email: string } | null;
  loading: boolean;
}>({ user: null, loading: true })
```
- Fetches `GET /api/me` on mount; stores result in context
- Used by: SubmitCTA, AdminRoute

New component: `apps/web/src/components/SubmitCTA.tsx`
- Props: `{ recipe: RecipeGraph }`
- Reads `AuthContext`
- States: `idle` | `authenticating` | `submitting` | `submitted` | `error`
- `idle + not logged in` → "Share with the community?" button → opens `AuthModal`
- `idle + logged in` → "Submit to catalog" button → calls `POST /api/library/recipe`
- `submitted` → "Submitted for review" banner (non-interactive)

New component: `apps/web/src/components/AuthModal.tsx`
- Explains what OAuth is used for (one sentence: "We use your GitHub or Google account to track submissions and give you credit.")
- Two buttons: "Continue with GitHub" (`/auth/github`), "Continue with Google" (`/auth/google`)
- Cancel closes modal

New screen: `apps/web/src/screens/AdminScreen.tsx`
- Route guarded by `AuthContext.user` + admin check (`GET /api/me` includes `isAdmin: boolean`)
- Fetches `GET /api/library/submissions`
- Table columns: Recipe Name, Submitter, Submitted At, Actions
- "Preview" opens existing `RecipeScreen` in a modal with the submission's recipe graph
- "Approve" / "Reject" call `PATCH /api/library/submissions/:id`; optimistically removes row from pending list

`App.tsx` additions:
- Wrap with `AuthContext.Provider`
- Add `/admin` route branch in the screen state machine: `Screen` union gets `'admin'`
- Navigate to admin via `?screen=admin` query param (server-side rendered path not needed; admin is a known URL)

**Surfaces that show SubmitCTA:**
- `RecipeScreen` — after the recipe header, when the recipe originates from the personal library (not already a verified catalog recipe)
- `AddRecipeScreen` — after a successful AI generation saves the recipe, inline below the save confirmation

**Moderation quality bar (documented for moderators, not enforced by code in Phase 3):**
- Recipe must have at least 3 steps
- At least 2 ingredients
- Name must not be a URL or placeholder
- Steps must be in English (manual check)

**Edge cases:**
- OAuth callback with invalid state param → server returns 400, client shows "Login failed. Please try again."
- Duplicate submission (same recipe submitted twice by same user) → server checks `recipe_json->>'recipeId'` in pending/approved submissions; returns 409 "Already submitted"; client shows "You've already submitted this recipe."
- User submits a recipe that was originally from the server catalog (a catalog recipe they haven't modified) → `SubmitCTA` checks `recipe.verified === true` and hides itself; no submission possible for unmodified catalog recipes
- Admin approves a recipe whose `recipeId` already exists in `recipes` table (duplicate from different user) → server uses `INSERT ... ON CONFLICT (recipe_id) DO NOTHING`; returns 200 with `{ action: 'skipped', reason: 'duplicate' }`; admin UI shows "Already in catalog"
- Session cookie expired mid-session → `POST /api/library/recipe` returns 401; client catches and re-opens `AuthModal`

## Data & Dependencies

- Reads: `RecipeGraph` from personal library (IndexedDB) to populate submission body; `GET /api/me` for user identity; `GET /api/library/submissions` for admin queue
- Writes: `submissions` table (Supabase); `recipes` table (Supabase, on approve)
- New Supabase tables: `users`, `submissions`
- New env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `ADMIN_EMAIL`
- Touches: `RecipeScreen`, `AddRecipeScreen`, `App.tsx` (screen union + AuthContext wrap), `apps/web/server/server.mts` (mount oauthRouter), `apps/web/server/api/libraryRouter.ts` (new routes)
- Does not touch: cook engine, calendar, pantry, Browse screen, Studio screen
- Phase dependency: Phase 3 has no hard dependency on Phase 2 (OCR) — it can ship independently as long as Phase 1 (AI generation + save to personal library) is complete, which it is
