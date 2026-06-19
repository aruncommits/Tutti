// Supabase-backed CurationStore. NOT run by tests/CI. Reuses the web server's pooled DB client (one
// TLS/connection policy). Curated recipes land as staging (verified=false); publishStaged() promotes
// them so the live /api/library/* (which filters verified=true) starts serving them.

import { toSummary, type RecipeGraph } from "@tutti/engine";
import { getPool } from "../../../apps/web/server/db/client.mts";
import type { CurationStore } from "./types";

export function createDbStore(): CurationStore {
  const pool = getPool();
  return {
    async existingKeys() {
      const res = await pool.query("select dish_id, tier from recipes");
      return new Set(res.rows.map((r: { dish_id: string; tier: string }) => `${r.dish_id}:${r.tier}`));
    },
    async upsert(r: RecipeGraph) {
      const s = toSummary(r);
      await pool.query(
        `insert into dishes (dish_id, name, category, cuisine, course)
         values ($1,$2,$3,$4,$5)
         on conflict (dish_id) do update set name=excluded.name, category=excluded.category,
           cuisine=excluded.cuisine, course=excluded.course, updated_at=now()`,
        [s.dishId, s.name, s.category, r.cuisine ?? null, r.course ?? null],
      );
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
    },
  };
}

/** Promote staged recipes to live. Pass dishIds to scope, or omit to publish everything unverified. */
export async function publishStaged(dishIds?: string[]): Promise<number> {
  const pool = getPool();
  const res = dishIds?.length
    ? await pool.query("update recipes set verified = true, updated_at = now() where verified = false and dish_id = any($1::text[])", [dishIds])
    : await pool.query("update recipes set verified = true, updated_at = now() where verified = false");
  return res.rowCount ?? 0;
}
