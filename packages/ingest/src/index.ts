// Tutti ingestion surface. MockParser ships now (no key); AiParser + fetchUrl land in Brief v3.
export * from "./parser.interface";
export { MockParser } from "./mock.parser";
export { buildDraftGraph, parseIngredient } from "./draft";
export { extractJsonLdRecipe, type JsonLdResult } from "./jsonld";
export { draftFromText, PasteParser } from "./text";
export { fetchRecipeFromUrl, htmlToText, type FetchRecipeOptions } from "./url";
export { parseMenu } from "./menu";
