// "Find online" pipeline (Brief v3 item 4). Fetches a recipe page and extracts a candidate graph,
// preferring schema.org JSON-LD (deterministic, key-free) and falling back to a heuristic parse
// of the page text. Browser-safe (no Anthropic SDK import); the optional AI fallback is injected.
//
// Legality/ethics (Doc 5, research pass): respect the site's robots.txt/ToS, extract FACTS
// (ingredients, steps) not copyrighted prose, and keep ingested recipes "unverified" until a human
// approves them. NOTE: calling this from the browser hits CORS on most recipe sites — a server-side
// fetch (or proxy) is the practical path; the function itself runs anywhere `fetch` exists.

import { validate } from "@tutti/engine";
import { extractJsonLdRecipe } from "./jsonld";
import { draftFromText } from "./text";
import type { ParseResult } from "./parser.interface";

export interface FetchRecipeOptions {
  /** override the global fetch (tests inject a stub so the gate makes no network call). */
  fetchImpl?: typeof fetch;
  /** optional AI fallback (e.g. AiParser.parse bound to text) when JSON-LD is absent. */
  aiParse?: (text: string) => Promise<ParseResult>;
}

/** Strip a page to readable text: drop script/style, turn tags into newlines, decode a few entities. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export async function fetchRecipeFromUrl(url: string, opts: FetchRecipeOptions = {}): Promise<ParseResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(url);
  const html = await res.text();

  // 1) preferred: schema.org Recipe JSON-LD
  const jsonld = extractJsonLdRecipe(html);
  if (jsonld.found && jsonld.graph) {
    return { graph: jsonld.graph, validation: jsonld.validation, unverified: true, notes: [`json-ld from ${url}`] };
  }

  // 2) fallback: parse the page text (AI if provided, else the deterministic heuristic parser)
  const text = htmlToText(html);
  if (opts.aiParse) {
    const r = await opts.aiParse(text);
    return { ...r, notes: [`ai from ${url}`, ...r.notes] };
  }
  const graph = draftFromText(text);
  return { graph, validation: validate(graph), unverified: true, notes: [`text fallback from ${url}`] };
}
