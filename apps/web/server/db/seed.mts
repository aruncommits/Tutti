// Seed the library from the bundled goldenLibrary (+ thali demo) — this same set is also the app's
// offline starter pack. Derives category/summary fields via the engine so the DB matches the client.
// Idempotent upsert by primary key. Run: `npm run db:seed -w apps/web` (after db:migrate).
import { goldenLibrary, thaliV1, groupVariants, toSummary, type RecipeGraph } from "@tutti/engine";
import { getPool, closePool } from "./client.mts";

const recipes: RecipeGraph[] = (() => {
  const map = new Map<string, RecipeGraph>();
  for (const r of [...goldenLibrary, ...thaliV1.recipes]) map.set(r.recipeId, r);
  return [...map.values()];
})();

const pool = getPool();
try {
  // Dishes first (FK target): one row per dish group, described by its elected default variant.
  for (const g of groupVariants(recipes)) {
    const d = g.defaultRecipe;
    const s = toSummary(d);
    await pool.query(
      `insert into dishes (dish_id, name, category, cuisine, course)
       values ($1,$2,$3,$4,$5)
       on conflict (dish_id) do update set
         name=excluded.name, category=excluded.category, cuisine=excluded.cuisine,
         course=excluded.course, updated_at=now()`,
      [g.dishId, g.name, s.category, d.cuisine ?? null, d.course ?? null],
    );
  }

  // Then every recipe (tier variant), with summary columns + the full graph as jsonb.
  for (const r of recipes) {
    const s = toSummary(r);
    await pool.query(
      `insert into recipes
         (recipe_id, dish_id, name, category, cuisine, course, tier, variant_label, servings,
          diets, allergens, tags, total_mins, kcal, protein, nutrition, graph, verified, version)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       on conflict (recipe_id) do update set
         dish_id=excluded.dish_id, name=excluded.name, category=excluded.category, cuisine=excluded.cuisine,
         course=excluded.course, tier=excluded.tier, variant_label=excluded.variant_label, servings=excluded.servings,
         diets=excluded.diets, allergens=excluded.allergens, tags=excluded.tags, total_mins=excluded.total_mins,
         kcal=excluded.kcal, protein=excluded.protein, nutrition=excluded.nutrition, graph=excluded.graph,
         verified=excluded.verified, version=excluded.version, updated_at=now()`,
      [
        s.recipeId, s.dishId, s.name, s.category, r.cuisine ?? null, r.course ?? null, s.tier,
        s.variantLabel ?? null, s.servings, s.diets, s.allergens, s.tags, s.totalMins, s.kcal, s.protein,
        r.nutrition ? JSON.stringify(r.nutrition) : null, JSON.stringify(r), r.verified, r.version,
      ],
    );
  }

  const d = await pool.query("select count(*)::int as n from dishes");
  const rc = await pool.query("select count(*)::int as n from recipes");
  console.log(`seed: ${d.rows[0].n} dishes, ${rc.rows[0].n} recipes ✓`);
} catch (e) {
  console.error("seed: FAILED", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await closePool();
}
