// Recompile the existing library through the engine compiler — fixes recipes left by the early
// curation bug (name="Imported recipe", servings=2) WITHOUT re-paying the AI. For each curated recipe
// it sets the authoritative catalog name and derives base servings from the ingredient weights
// (compileRecipe), then re-upserts — rewriting the graph blob AND every denormalized column (name,
// servings, recomputed nutrition) consistently via toSummary. Content (ingredients/steps/timings) is
// untouched. Dry-run by default; pass --commit to write.
//   npx tsx --env-file=apps/web/.env packages/curation/src/recompileLibrary.mts [--commit]
import { inferServings, type Category, type RecipeGraph } from "@tutti/engine";
import { SEED_CATALOG } from "./catalog";
import { getPool, closePool } from "../../../apps/web/server/db/client.mts";
import { createDbStore } from "./dbStore.mts";

const commit = process.argv.includes("--commit");
const byDish = new Map(SEED_CATALOG.map((e) => [e.dishId, e]));

// Sensible typical batch when ingredient-mass inference is low-confidence — never leave a wrong "2"
// (and never the heuristic's "1"/"40"). Most home dishes serve ~4; condiments/desserts serve more.
const DEFAULT_SERVINGS: Partial<Record<Category, number>> = {
  "Chutneys & Sauces": 8,
  Desserts: 6,
  Drinks: 4,
  "Snacks & Starters": 4,
  Breads: 4,
};
const pool = getPool();
const store = createDbStore();

try {
  const res = await pool.query(
    "select recipe_id, dish_id, graph, servings, verified from recipes where dish_id = any($1::text[]) order by dish_id, tier",
    [[...byDish.keys()]],
  );
  const dist: Record<number, number> = {};
  let changed = 0;
  const outliers: string[] = [];

  for (const row of res.rows as { recipe_id: string; dish_id: string; graph: RecipeGraph; servings: number; verified: boolean }[]) {
    const entry = byDish.get(row.dish_id)!;
    const graph = row.graph;
    const category = entry.category as Category;
    // Derive base servings from the ingredient weights; fall back to a sane default when low-confidence.
    const servings = inferServings(graph, category) ?? DEFAULT_SERVINGS[category] ?? 4;
    const compiled: RecipeGraph = { ...graph, name: entry.name, servings, servingsSource: "inferred", verified: row.verified };

    dist[servings] = (dist[servings] ?? 0) + 1;
    if (row.servings !== servings || graph.name !== entry.name) {
      changed++;
      const line = `  ${row.recipe_id}: serves ${row.servings}→${servings}  "${graph.name}"→"${entry.name}"`;
      if (servings <= 1 || servings >= 16) outliers.push(line);
      else if (changed <= 20) console.log(line);
    }
    if (commit) await store.upsert(compiled);
  }

  if (outliers.length) {
    console.log(`\n⚠ outliers (servings ≤1 or ≥20) — review:`);
    outliers.forEach((l) => console.log(l));
  }
  console.log(`\n${res.rows.length} recipes scanned · ${changed} changed`);
  console.log("servings distribution:", Object.keys(dist).sort((a, b) => Number(a) - Number(b)).map((k) => `${k}:${dist[Number(k)]}`).join("  "));
  console.log(commit ? "✓ COMMITTED to DB." : "DRY-RUN — pass --commit to write.");
} finally {
  await closePool();
}
