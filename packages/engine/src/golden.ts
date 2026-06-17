// Typed access to the hand-authored golden fixture (Doc 4 §2). Used by tests and as
// seed data for the UI until recipe ingestion (Brief v3) is the primary source.

import thali from "../fixtures/thali_v1.json";
import type { KitchenProfile, RecipeGraph } from "./types";

export interface SessionFixture {
  sessionFixture: string;
  targetServeTime: string;
  kitchenProfile: KitchenProfile;
  recipes: RecipeGraph[];
}

export const thaliV1 = thali as unknown as SessionFixture;
