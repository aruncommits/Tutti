// Server-side AI router. App-provided AI: the app holds the keys (never the client). Each task is
// routed to whichever model — across the full OpenAI / Anthropic / Google lineups — does that task
// best, falling back across providers on error. Quality is never the variable; cost is optimized by
// matching the task to the right model. Model ids are CONFIG here — swap them as models evolve.
//
// Runs in Node (Vite dev middleware or a serverless function). Uses global fetch. No SDKs bundled.

export type Provider = "openai" | "anthropic" | "google";
export type Task = "generate" | "structure" | "repair";
export type Keys = Partial<Record<Provider, string>>;

type Candidate = { provider: Provider; model: string };

// Ordered candidates per task — best-fit first, then cross-provider fallbacks. Quality-first:
// a frontier model for open-ended generation; a fast capable model where it fully suffices.
const REGISTRY: Record<Task, Candidate[]> = {
  // Open-ended "write me a recipe" — needs careful structure, realistic timings, dependencies.
  generate: [
    { provider: "anthropic", model: "claude-sonnet-4-6" },
    { provider: "openai", model: "gpt-4o" },
    { provider: "google", model: "gemini-2.5-pro" },
  ],
  // Clean messy pasted / scraped text into a tidy recipe — a fast model nails this at low cost.
  structure: [
    { provider: "google", model: "gemini-2.5-flash" },
    { provider: "openai", model: "gpt-4o-mini" },
    { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
  ],
  // Re-emit when validation failed — small, instruction-following, cheap.
  repair: [
    { provider: "openai", model: "gpt-4o-mini" },
    { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
    { provider: "google", model: "gemini-2.5-flash" },
  ],
};

const SYSTEM =
  "You are a precise recipe writer. Given a request, output exactly ONE recipe as plain text and " +
  "nothing else — no preamble, no notes, no markdown fences. Use this exact shape:\n\n" +
  "<Recipe Title>\n\nIngredients:\n- <quantity> <ingredient>\n- ...\n\nMethod:\n" +
  "1. <step, include an approximate time like (5 min) when there is cooking, simmering, resting or baking>\n" +
  "2. ...\n\nKeep steps concrete and ordered. Prefer common measurements. Do not add commentary.";

export interface RouteResult {
  text: string;
  provider: Provider;
  model: string;
}

// Provider adapters — each returns the model's text completion or throws.
async function callOpenAI(model: string, user: string, key: string): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`openai ${r.status}: ${await r.text()}`);
  const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("openai: empty response");
  return text;
}

async function callAnthropic(model: string, user: string, key: string): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      temperature: 0.4,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`);
  const data = (await r.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.map((b) => b.text ?? "").join("").trim();
  if (!text) throw new Error("anthropic: empty response");
  return text;
}

async function callGoogle(model: string, user: string, key: string): Promise<string> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.4 },
      }),
    },
  );
  if (!r.ok) throw new Error(`google ${r.status}: ${await r.text()}`);
  const data = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("google: empty response");
  return text;
}

const ADAPTERS: Record<Provider, (model: string, user: string, key: string) => Promise<string>> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  google: callGoogle,
};

/** Route a recipe request to the best available model for the task, falling back across providers. */
export async function routeRecipe(prompt: string, keys: Keys, task: Task = "generate"): Promise<RouteResult> {
  const candidates = REGISTRY[task].filter((c) => keys[c.provider]);
  if (candidates.length === 0) throw new Error("no-keys");
  let lastErr: unknown;
  for (const c of candidates) {
    try {
      const text = await ADAPTERS[c.provider](c.model, prompt, keys[c.provider]!);
      return { text, provider: c.provider, model: c.model };
    } catch (e) {
      lastErr = e; // try the next provider
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("all-providers-failed");
}

/** Which providers are configured (for the client to show availability without exposing keys). */
export function configuredProviders(keys: Keys): Provider[] {
  return (["openai", "anthropic", "google"] as Provider[]).filter((p) => keys[p]);
}
