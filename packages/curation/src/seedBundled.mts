// Migrate the app's bundled, hand-authored recipes (goldenLibrary + the thali demo) INTO the server
// catalog, so the library is a single comprehensive source and none of the local recipes are lost.
// They're already validated RecipeGraphs; upsert publishes them live (verified). Idempotent — re-run
// safely (upsert on recipe_id). Run: npx tsx --env-file=apps/web/.env packages/curation/src/seedBundled.mts
import { goldenLibrary, thaliV1 } from "@tutti/engine";
import { createDbStore } from "./dbStore.mts";
import { closePool } from "../../../apps/web/server/db/client.mts";

const store = createDbStore();
const seen = new Set<string>();
const recipes = [...goldenLibrary, ...thaliV1.recipes].filter((r) => {
  if (seen.has(r.recipeId)) return false;
  seen.add(r.recipeId);
  return true;
});

let ok = 0;
let fail = 0;
try {
  for (const r of recipes) {
    try {
      await store.upsert({ ...r, verified: true }); // publish live
      ok++;
    } catch (e) {
      fail++;
      console.error(`  ✗ ${r.recipeId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`seeded ${ok} bundled recipes into the server (${fail} failed)`);
} finally {
  await closePool();
}
