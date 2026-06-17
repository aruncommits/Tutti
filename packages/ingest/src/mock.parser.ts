// Deterministic parser used by the gate (no API key). It produces a tiny but valid
// RecipeGraph so the ingest contract + UI can be exercised without any LLM call.

import { validate } from "@tutti/engine";
import type { RecipeGraph } from "@tutti/engine";
import type { ParseRequest, ParseResult, RecipeParser } from "./parser.interface";

function slug(text: string): string {
  const base = text.trim().split(/\s+/).slice(0, 3).join("-").toLowerCase().replace(/[^a-z0-9-]/g, "");
  return base || "recipe";
}

export class MockParser implements RecipeParser {
  readonly name = "mock";

  async parse(req: ParseRequest): Promise<ParseResult> {
    const id = `rec_${slug(req.text)}`;
    const graph: RecipeGraph = {
      recipeId: id,
      name: req.text.trim().split("\n")[0]?.slice(0, 40) || "Untitled recipe",
      version: 1,
      servings: 2,
      verified: false,
      nodes: [
        { nodeId: `${id}_1`, recipeId: id, title: "Prep ingredients", phase: "prep", attention: "active",
          duration: { estMins: 5, minMins: 3, maxMins: 8, elastic: true },
          ingredients: [], resources: [{ category: "cutting_board", count: 1 }], dependencies: [] },
        { nodeId: `${id}_2`, recipeId: id, title: "Cook", phase: "cook", attention: "passive",
          duration: { estMins: 12, minMins: 10, maxMins: 18, elastic: false },
          ingredients: [], resources: [{ category: "burner", count: 1 }], dependencies: [`${id}_1`] },
        { nodeId: `${id}_3`, recipeId: id, title: "Plate & serve", phase: "serve", attention: "active",
          duration: { estMins: 2, minMins: 1, maxMins: 3, elastic: false },
          ingredients: [], resources: [], dependencies: [`${id}_2`] },
      ],
    };
    const validation = validate(graph);
    return {
      graph: validation.ok ? graph : null,
      validation,
      unverified: true,
      notes: [`parsed by mock parser from source="${req.source}"`],
    };
  }
}
