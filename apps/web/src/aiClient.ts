// Thin client to the app's AI endpoint. The browser never holds keys — it calls our server, which
// routes to the best model. Returns recipe TEXT, which we parse with the same paste pipeline.

export interface AiUsage {
  providers: string[];
  used: number;
  free: number;
  remaining: number;
}

export interface AiRecipe {
  text: string;
  model?: string;
  provider?: string;
  remaining?: number;
}

/** Server AI availability + quota. null if the endpoint isn't reachable (e.g. static prod build). */
export async function fetchAiUsage(): Promise<AiUsage | null> {
  try {
    const r = await fetch("/api/usage");
    if (!r.ok) return null;
    return (await r.json()) as AiUsage;
  } catch {
    return null;
  }
}

/** Ask the app's AI to write a recipe. Throws with a human message on failure / no-key / quota. */
export async function askAiForRecipe(prompt: string): Promise<AiRecipe> {
  let r: Response;
  try {
    r = await fetch("/api/recipe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  } catch {
    throw new Error("Couldn't reach the AI service. Check your connection.");
  }
  const data = (await r.json().catch(() => ({}))) as Partial<AiRecipe> & { message?: string; error?: string };
  if (!r.ok || !data.text) {
    throw new Error(data.message || data.error || `AI request failed (${r.status})`);
  }
  return data as AiRecipe;
}
