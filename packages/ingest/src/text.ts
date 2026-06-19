// Heuristic plain-text recipe parser (Brief v3 item 2) — the key-free "Paste a recipe" path.
// Splits pasted text into an ingredients section and a steps section (by headers, else by line
// shape), then reuses buildDraftGraph. Best-effort; a human or the AiParser refines.

import { validate, type RecipeGraph } from "@tutti/engine";
import { buildDraftGraph } from "./draft";
import type { ParseRequest, ParseResult, RecipeParser } from "./parser.interface";

const slug = (s: string) => "rec_" + (s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "recipe");
const stripBullet = (l: string) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim();

const UNITS = /\b(cups?|tbsp|tsp|teaspoons?|tablespoons?|grams?|g|kg|ml|l|oz|lb|cloves?|pinch|cans?|slices?|sprigs?|handful)\b/i;
const STARTS_QTY = /^[\d¼½¾⅓⅔]/;
const ingredientLike = (l: string) => (STARTS_QTY.test(l) || UNITS.test(l)) && l.split(/\s+/).length <= 9;

const ING_HDR = /^ingredients?\b/i;
const STEP_HDR = /^(method|directions|instructions|steps?|preparation)\b/i;
// "Serves: 4", "Serves 4", "Serving 6", "Yield: 8" — the recipe's base yield (needs a number).
const SERVES = /\b(?:serves?|servings?|yield)\b[:\s]*([0-9]+)/i;
// "Best for: 4", "Minimum: 2", "Makes at least 4" — the recommended smallest good batch.
const MINBATCH = /\b(?:best for|minimum|min batch|makes at least)\b[:\s]*([0-9]+)/i;
// a first line starting with a cooking verb is a STEP, not the recipe title
const STEP_VERB = /^(boil|add|heat|mix|stir|cook|bake|fry|saut|simmer|drain|pour|combine|preheat|whisk|beat|fold|season|garnish|serve|slice|dice|chop|peel|grate|knead|roll|cover|remove|turn|set|let|bring|reduce|cut|place|transfer|spread|toss|grill|roast|temper)\b/i;

/** Parse a pasted recipe blob into a draft RecipeGraph (Doc 5; conservative defaults via draft.ts). */
export function draftFromText(raw: string): RecipeGraph {
  const allLines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (allLines.length === 0) return buildDraftGraph("rec_empty", "Untitled recipe", [], []);

  // Capture the base yield ("Serves: N") if stated, then drop those lines so they don't pollute
  // ingredients/steps. The app scales per-person from this base (servings.ts factorForPeople).
  const servesLine = allLines.find((l) => SERVES.test(l));
  const servings = servesLine ? Math.min(40, Math.max(1, parseInt(servesLine.match(SERVES)![1]!, 10))) : undefined;
  const minLine = allLines.find((l) => MINBATCH.test(l));
  const minServings = minLine ? Math.min(40, Math.max(1, parseInt(minLine.match(MINBATCH)![1]!, 10))) : undefined;
  const lines = allLines.filter((l) => !SERVES.test(l) && !MINBATCH.test(l));
  if (lines.length === 0) return buildDraftGraph("rec_empty", "Untitled recipe", [], [], servings, minServings);

  // first line is the title unless it's a section header
  let name = "Imported recipe";
  let start = 0;
  if (!ING_HDR.test(lines[0]!) && !STEP_HDR.test(lines[0]!) && !STEP_VERB.test(lines[0]!) && lines[0]!.split(/\s+/).length <= 8) {
    name = lines[0]!;
    start = 1;
  }
  const body = lines.slice(start);

  const ingHdr = body.findIndex((l) => ING_HDR.test(l));
  const stepHdr = body.findIndex((l) => STEP_HDR.test(l));
  let ingredients: string[] = [];
  let steps: string[] = [];

  if (ingHdr !== -1 && stepHdr !== -1 && stepHdr > ingHdr) {
    ingredients = body.slice(ingHdr + 1, stepHdr).map(stripBullet).filter(Boolean);
    steps = body.slice(stepHdr + 1).map(stripBullet).filter(Boolean);
  } else if (stepHdr !== -1) {
    ingredients = body.slice(0, stepHdr).filter((l) => !ING_HDR.test(l)).map(stripBullet).filter(ingredientLike);
    steps = body.slice(stepHdr + 1).map(stripBullet).filter(Boolean);
  } else {
    for (const l of body.map(stripBullet)) {
      if (!l) continue;
      if (ingredientLike(l)) ingredients.push(l);
      else steps.push(l);
    }
  }

  if (steps.length === 0) steps = body.map(stripBullet).filter(Boolean); // no usable split → all steps
  return buildDraftGraph(slug(name), name, ingredients, steps, servings, minServings);
}

/** Key-free parser for pasted text (and the offline fallback for url/ai before a key is added). */
export class PasteParser implements RecipeParser {
  readonly name = "paste";
  async parse(req: ParseRequest): Promise<ParseResult> {
    const graph = draftFromText(req.text);
    const validation = validate(graph);
    return {
      graph,
      validation,
      unverified: true,
      notes: [`heuristic parse — ${graph.nodes.length} steps, ${graph.nodes[0]?.ingredients.length ?? 0} ingredients`],
    };
  }
}
