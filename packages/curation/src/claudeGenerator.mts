// RecipeGenerator backed by the Claude Code CLI (`claude -p`) — uses the local Claude Code
// subscription instead of paid provider API keys. This is the "for now" path; production swaps in
// the API-key generator (aiGenerator.mts). Prompt goes via stdin (no arg-escaping); output is the
// deterministic paste format, parsed by the same PasteParser the in-app flow uses.

import { spawn } from "node:child_process";
import { PasteParser } from "@tutti/ingest";
import type { GenerateRequest, RecipeGenerator } from "./types";

const MODEL = process.env.CURATION_MODEL || "haiku"; // fast + cheap; recipes are short structured text

const TIER_HINT: Record<GenerateRequest["tier"], string> = {
  simple: "the quickest possible version — minimal steps & ingredients, weeknight-easy",
  moderate: "a balanced everyday version",
  complex: "an elaborate, restaurant-quality version with full technique",
};

/** Run `claude -p` headlessly, feeding the prompt on stdin; resolve its stdout text. */
function claudeText(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["-p", "--model", MODEL]; // simple flags only; the format rules live in the prompt (stdin)
    const cp = spawn("claude", args, { shell: process.platform === "win32" });
    let out = "";
    let err = "";
    cp.stdout.on("data", (d) => (out += d.toString()));
    cp.stderr.on("data", (d) => (err += d.toString()));
    cp.on("error", reject);
    cp.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(err.trim() || `claude exited ${code}`))));
    cp.stdin.write(prompt);
    cp.stdin.end();
  });
}

// Drop any preamble the model emits: the recipe starts at the title line just above "Ingredients:".
function stripToRecipe(text: string): string {
  const lines = text.replace(/```/g, "").split("\n");
  const ing = lines.findIndex((l) => /^\s*ingredients:?\s*$/i.test(l));
  if (ing < 0) return text.trim(); // let the parser try; it'll report if unusable
  let title = ing - 1;
  while (title > 0 && !lines[title]!.trim()) title--;
  return lines.slice(title).join("\n").trim();
}

export function createClaudeGenerator(): RecipeGenerator {
  return {
    async generate(req: GenerateRequest) {
      const prompt =
        `Output ONLY the recipe text — no preamble, no markdown, no commentary.\n` +
        `Write ONE recipe for "${req.name}" (${req.category}${req.cuisine ? `, ${req.cuisine}` : ""}) — ${TIER_HINT[req.tier]}, ` +
        `for the dish's natural standard batch. Format strictly: a title line, then a line "Serves: N" (the batch this yields), ` +
        `then a line "Best for: M" (the smallest batch that still turns out well), ` +
        `then a line "Ingredients:" with one ingredient per line (with quantity), then a line "Method:" with numbered steps.`;
      const raw = await claudeText(prompt);
      const result = await new PasteParser().parse({ source: "paste", text: stripToRecipe(raw) });
      if (!result.graph) throw new Error(`parse failed: ${result.validation.errors.join("; ")}`);
      return result.graph;
    },
  };
}
