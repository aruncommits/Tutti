// The seeded Golden Library (Doc 8/9; Brief v8 item 1): hand-authored, human-verified, FROZEN
// vegetarian South Indian recipes that ship with Tutti so the app is valuable before a user pastes
// anything. Data only — same RecipeGraph schema the runtime cooks from; no LLM (Doc 1 §4).

import library from "../fixtures/library.json";
import extra from "../fixtures/library-extra.json";
import type { RecipeGraph } from "./types";

// The seeded library = the original verified set + the cross-cuisine/course expansion (Brief v48).
export const goldenLibrary: RecipeGraph[] = [
  ...(library as unknown as { recipes: RecipeGraph[] }).recipes,
  ...(extra as unknown as { recipes: RecipeGraph[] }).recipes,
];
