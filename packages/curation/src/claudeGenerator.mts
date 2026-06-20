// RecipeGenerator backed by the Claude Code CLI (`claude -p`) — local subscription, no API keys.
//
// Cheapest-but-best (measured): on the CLI the per-call overhead dominates, so the win is FEWER calls,
// not more passes. We generate all THREE tiers of a dish in ONE call (default model Sonnet for a good
// quality floor), cache them, and serve each tier from cache — so the pipeline's 3 generate() calls
// per dish cost ONE model call. Spawned from a neutral cwd so the Tutti project context isn't loaded
// into every call. Usage is tracked per model so a run shows exactly what it spent.
//
// Env: CURATION_MODEL (default "sonnet"), CURATION_NO_BATCH=1 (one call per tier — safety valve).

import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import type { ComplexityTier, RecipeGraph } from "@tutti/engine";
import type { GenerateRequest, RecipeGenerator } from "./types";
import { TIERS, parseBatch, toGraph } from "./batchParse";

const MODEL = process.env.CURATION_MODEL || "sonnet";

const TIER_HINT: Record<ComplexityTier, string> = {
  simple: "SIMPLE — quickest, minimal steps & ingredients, weeknight-easy",
  moderate: "MODERATE — a balanced everyday version",
  complex: "COMPLEX — elaborate, restaurant-quality with full technique",
};

const FORMAT =
  'each recipe in this EXACT format: a title line, then "Serves: N" (the batch it yields), then ' +
  '"Best for: M" (smallest batch that still turns out well), then "Ingredients:" with one ingredient ' +
  'per line (with quantity), then "Method:" with numbered steps.';

// ---- usage tracking (per requested model alias) -------------------------------------------------
type ModelUsage = { calls: number; costUsd: number; inputTokens: number; outputTokens: number; ms: number };
const usage: Record<string, ModelUsage> = {};
const realModelIds = new Set<string>();
export function claudeUsage() {
  return { byModel: usage, realModels: [...realModelIds] };
}

/** One `claude -p --model <model> --output-format json` call on stdin, from a neutral cwd. */
function claudeRun(model: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["-p", "--model", model, "--output-format", "json"];
    const cp = spawn("claude", args, { shell: process.platform === "win32", cwd: tmpdir() });
    let out = "";
    let err = "";
    cp.stdout.on("data", (d) => (out += d.toString()));
    cp.stderr.on("data", (d) => (err += d.toString()));
    cp.on("error", reject);
    cp.on("close", (code) => {
      if (code !== 0) return reject(new Error(err.trim() || `claude exited ${code}`));
      try {
        const j = JSON.parse(out) as {
          result?: string;
          total_cost_usd?: number;
          duration_ms?: number;
          usage?: { input_tokens?: number; output_tokens?: number };
          modelUsage?: Record<string, unknown>;
        };
        const u = (usage[model] ??= { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0, ms: 0 });
        u.calls += 1;
        u.costUsd += j.total_cost_usd ?? 0;
        u.inputTokens += j.usage?.input_tokens ?? 0;
        u.outputTokens += j.usage?.output_tokens ?? 0;
        u.ms += j.duration_ms ?? 0;
        for (const id of Object.keys(j.modelUsage ?? {})) realModelIds.add(id);
        resolve(typeof j.result === "string" ? j.result : out);
      } catch {
        resolve(out);
      }
    });
    cp.stdin.write(prompt);
    cp.stdin.end();
  });
}

function batchPrompt(req: GenerateRequest): string {
  const cuisine = req.cuisine ? `, ${req.cuisine}` : "";
  return (
    `Write THREE versions of "${req.name}" (${req.category}${cuisine}) for the dish's natural batch:\n` +
    TIERS.map((t) => `- ${TIER_HINT[t]}`).join("\n") +
    `\n\nOutput ONLY the three recipes, each preceded by a line exactly "=== TIER: <tier> ===" ` +
    `(<tier> = simple, moderate, complex), and ${FORMAT} No preamble, no markdown, no commentary.`
  );
}

export function createClaudeGenerator(): RecipeGenerator {
  const noBatch = process.env.CURATION_NO_BATCH === "1";
  const cache = new Map<string, Map<ComplexityTier, RecipeGraph>>(); // dishId → tier → graph

  async function batchDish(req: GenerateRequest): Promise<Map<ComplexityTier, RecipeGraph>> {
    const map = await parseBatch(await claudeRun(MODEL, batchPrompt(req)));
    if (map.size === 0) throw new Error("batch produced no parseable tiers");
    return map;
  }

  return {
    async generate(req: GenerateRequest) {
      if (noBatch) {
        // One call for just this tier (fallback if batching proves flaky).
        const prompt = `Write ONE recipe for "${req.name}" (${req.category}${req.cuisine ? `, ${req.cuisine}` : ""}) — ${TIER_HINT[req.tier]}; ${FORMAT} Output ONLY the recipe.`;
        const g = await toGraph(await claudeRun(MODEL, prompt));
        if (!g) throw new Error("parse failed");
        return g;
      }
      let byTier = cache.get(req.dishId);
      if (!byTier) {
        byTier = await batchDish(req);
        cache.set(req.dishId, byTier);
      }
      const g = byTier.get(req.tier);
      if (!g) throw new Error(`batch missing tier ${req.tier}`);
      return g;
    },
  };
}
