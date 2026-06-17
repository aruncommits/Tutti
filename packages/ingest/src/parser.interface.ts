// Recipe ingestion (Doc 5). The LLM lives ONLY here, offline — never on the cooking path.
// A parser turns raw text/URL into a candidate RecipeGraph; the engine's validate() gates it.

import type { RecipeGraph, ValidationResult } from "@tutti/engine";

export interface ParseRequest {
  /** "paste" raw text, "url" to fetch-then-parse, "ai" to generate from a prompt. */
  source: "paste" | "url" | "ai";
  text: string; // raw recipe text, a URL, or an AI prompt depending on source
}

export interface ParseResult {
  graph: RecipeGraph | null;
  validation: ValidationResult;
  /** unverified = auto-parsed, skipped human review (Doc 5 §7) → shows a badge in the UI. */
  unverified: boolean;
  notes: string[];
}

export interface RecipeParser {
  readonly name: string;
  parse(req: ParseRequest): Promise<ParseResult>;
}
