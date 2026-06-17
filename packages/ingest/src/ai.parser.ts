// AiParser (Brief v3 item 3) — the real LLM recipe parser. NODE-ONLY: exported from "@tutti/
// ingest/ai", never from the main index, and the Anthropic SDK is loaded via a lazy dynamic
// import so it never bundles into the browser app. The cooking runtime never imports this.
//
// LLM boundary (Doc 1 P2 / Doc 5): this runs OFFLINE in the content pipeline, turns recipe text
// into a candidate RecipeGraph via tool-forced structured output (Doc 5 §3 prompt), then the
// deterministic engine validate() gate runs with a one-shot repair loop (Doc 5 §4).

import type AnthropicNS from "@anthropic-ai/sdk"; // type-only — erased at build, never bundled
import { validate, type RecipeGraph } from "@tutti/engine";
import type { ParseRequest, ParseResult, RecipeParser } from "./parser.interface";

/** Live only when a key is present. process is undefined in the browser, hence the guard. */
export function isAiAvailable(): boolean {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return !!g.process?.env?.ANTHROPIC_API_KEY;
}

/** Injectable so tests exercise the validate→repair logic without a network call or a key. */
export type RecipeGraphCaller = (recipeText: string, repairNote?: string) => Promise<RecipeGraph>;

const SYSTEM_PROMPT = `You convert a single human recipe into a structured Directed Acyclic Graph of kitchen tasks. Output ONLY via the provided tool. Rules:
1. ATOMICITY: smallest meaningful task nodes, one physical action each.
2. PHASE: "prep" (no heat) | "cook" (heat applied) | "serve" (plating/rest/garnish).
3. ATTENTION: "active" (hands continuously) | "passive" (proceeds without hands: simmer/bake/rest). When unsure, default "active" — the safe choice.
4. DEPENDENCIES: a node depends on another ONLY if it physically cannot start until that one completes. Never invent ordering — false dependencies destroy parallelism. Reference by nodeId.
5. INGREDIENTS: attach each to the exact node where it is added, with amount, unit, preparedState. No separate global list.
6. DURATION: estMins plus a plausible minMins/maxMins. elastic=true ONLY for hands-on tasks that scale with speed (chopping, kneading); false for fixed-physics (a 15-min simmer is 15 min for everyone).
7. RESOURCES: physical equipment each node occupies (burner, oven, pan, blender, pressure_cooker, cutting_board), with count and capability tags. Do NOT add a "hands" resource — the engine derives it from attention.
8. Do not set "status" (runtime only). If ambiguous, choose conservatively and add a reviewerNote.`;

const RECIPE_GRAPH_SCHEMA = {
  type: "object",
  properties: {
    recipeId: { type: "string" },
    name: { type: "string" },
    version: { type: "integer" },
    servings: { type: "integer" },
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nodeId: { type: "string" },
          recipeId: { type: "string" },
          title: { type: "string" },
          instruction: { type: "string" },
          phase: { type: "string", enum: ["prep", "cook", "serve"] },
          attention: { type: "string", enum: ["active", "passive"] },
          duration: {
            type: "object",
            properties: {
              estMins: { type: "number" },
              minMins: { type: "number" },
              maxMins: { type: "number" },
              elastic: { type: "boolean" },
            },
            required: ["estMins", "minMins", "maxMins", "elastic"],
          },
          ingredients: { type: "array", items: { type: "object" } },
          resources: { type: "array", items: { type: "object" } },
          dependencies: { type: "array", items: { type: "string" } },
        },
        required: ["nodeId", "recipeId", "title", "phase", "attention", "duration", "ingredients", "resources", "dependencies"],
      },
    },
  },
  required: ["recipeId", "name", "version", "servings", "nodes"],
};

/** Build the default caller backed by the Anthropic SDK (lazy import — Node only). */
async function defaultCaller(): Promise<RecipeGraphCaller> {
  const mod = await import("@anthropic-ai/sdk");
  const client = new mod.default();
  return async (recipeText, repairNote) => {
    const userText = repairNote
      ? `${recipeText}\n\nYour previous output failed validation: ${repairNote}\nFix the issues and re-emit the corrected graph.`
      : recipeText;
    // params cast loosely: adaptive-thinking + forced-tool typings vary across SDK versions.
    const res = (await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      tools: [{ name: "emit_recipe_graph", description: "Emit the parsed recipe as a RecipeGraph.", input_schema: RECIPE_GRAPH_SCHEMA }],
      tool_choice: { type: "tool", name: "emit_recipe_graph" },
      messages: [{ role: "user", content: userText }],
    } as unknown as AnthropicNS.MessageCreateParamsNonStreaming)) as AnthropicNS.Message;
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") throw new Error("AiParser: model returned no tool_use block");
    return block.input as RecipeGraph;
  };
}

export class AiParser implements RecipeParser {
  readonly name = "ai";
  constructor(private readonly call?: RecipeGraphCaller) {}

  async parse(req: ParseRequest): Promise<ParseResult> {
    const caller = this.call ?? (await defaultCaller());
    const notes: string[] = [];

    let graph = await caller(req.text);
    let validation = validate(graph);

    // one-shot repair loop (Doc 5 §4): re-prompt once with the validator errors.
    if (!validation.ok) {
      notes.push(`repair: ${validation.errors.join("; ")}`);
      graph = await caller(req.text, validation.errors.join("; "));
      validation = validate(graph);
    }

    return {
      graph,
      validation,
      unverified: true,
      notes: [`ai parse (${graph.nodes.length} nodes)`, ...notes],
    };
  }
}
