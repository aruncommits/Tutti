// Recipe-library query layer over Supabase Postgres. Returns the engine's lightweight DishSummary /
// RecipeSummary shapes (never full task-graphs in lists). Discovery lists DISHES — variants of one
// dish collapse into a single card. Run by the standalone API server (server.mts) via tsx; NOT part
// of the browser tsconfig graph, so Node-typed `pg` stays out of the client typecheck.

import type { Category, ComplexityTier, DishSummary, RecipeGraph, RecipeSummary } from "@tutti/engine";
import { getPool } from "../db/client.mts";

const SUMMARY_COLS = `recipe_id, dish_id, name, category, cuisine, course, tier, variant_label,
  servings, diets, allergens, tags, total_mins, kcal, protein, verified`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSummary(r: any): RecipeSummary {
  return {
    recipeId: r.recipe_id,
    dishId: r.dish_id,
    name: r.name,
    category: r.category as Category,
    cuisine: r.cuisine ?? undefined,
    course: r.course ?? undefined,
    tier: r.tier as ComplexityTier,
    variantLabel: r.variant_label ?? undefined,
    servings: r.servings,
    diets: r.diets ?? [],
    allergens: r.allergens ?? [],
    tags: r.tags ?? [],
    totalMins: r.total_mins,
    kcal: r.kcal,
    protein: r.protein,
    verified: r.verified,
  };
}

const TIER_ORDER: Record<ComplexityTier, number> = { simple: 0, moderate: 1, complex: 2 };
const byTier = (a: RecipeSummary, b: RecipeSummary) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier];

/** Collapse a dish's verified variants into one card (moderate is the elected default, else first). */
function toDish(variants: RecipeSummary[]): DishSummary {
  const sorted = [...variants].sort(byTier);
  const def = sorted.find((v) => v.tier === "moderate") ?? sorted[0]!;
  return {
    dishId: def.dishId,
    name: def.name,
    category: def.category,
    cuisine: def.cuisine,
    course: def.course,
    tiers: sorted.map((v) => ({ tier: v.tier, recipeId: v.recipeId, totalMins: v.totalMins, kcal: v.kcal })),
    defaultRecipeId: def.recipeId,
  };
}

export interface SearchParams {
  q?: string;
  category?: string;
  cuisine?: string;
  maxMins?: number;
  diets?: string[];
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  dishes: DishSummary[];
  total: number; // distinct dishes matching, across all pages
  page: number;
  pageSize: number;
  facets: { categories: { value: string; count: number }[] };
}

// Shared filter predicate — verified only; every facet optional (null = "any"). Param order fixed.
const FILTER_SQL = `verified = true
  and ($1::text is null or search @@ plainto_tsquery('simple', $1) or name ilike '%' || $1 || '%')
  and ($2::text is null or category = $2)
  and ($3::text is null or cuisine = $3)
  and ($4::int is null or total_mins <= $4)
  and ($5::text[] is null or diets @> $5)`;

/** Faceted, paginated dish search. Pages at the DISH level (the "hundreds of biryanis" fix). */
export async function searchDishes(p: SearchParams): Promise<SearchResult> {
  const pool = getPool();
  const page = Math.max(1, p.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, p.pageSize ?? 20));
  const args = [
    p.q?.trim() || null,
    p.category || null,
    p.cuisine || null,
    p.maxMins ?? null,
    p.diets && p.diets.length ? p.diets : null,
  ];

  // Rank dishes by popularity (max across their variants), then name — so the best dishes surface
  // first as the catalog grows. dish_id is the final tiebreak for a stable, deterministic page order.
  const pageRes = await pool.query(
    `with matched as (
       select dish_id, max(popularity) as pop, min(name) as nm
       from recipes where ${FILTER_SQL} group by dish_id
     )
     select dish_id, (select count(*) from matched)::int as total
     from matched order by pop desc, nm asc, dish_id asc limit $6 offset $7`,
    [...args, pageSize, (page - 1) * pageSize],
  );
  const dishIds = pageRes.rows.map((r) => r.dish_id as string);
  const total = pageRes.rows[0]?.total ?? 0;

  let dishes: DishSummary[] = [];
  if (dishIds.length) {
    const varRes = await pool.query(
      `select ${SUMMARY_COLS} from recipes where verified = true and dish_id = any($1::text[])`,
      [dishIds],
    );
    const byDish = new Map<string, RecipeSummary[]>();
    for (const row of varRes.rows) {
      const s = rowToSummary(row);
      (byDish.get(s.dishId) ?? byDish.set(s.dishId, []).get(s.dishId)!).push(s);
    }
    dishes = dishIds.map((id) => toDish(byDish.get(id)!));
  }

  const facetRes = await pool.query(
    `select category, count(distinct dish_id)::int n from recipes where ${FILTER_SQL} group by category order by n desc, category`,
    args,
  );

  return {
    dishes,
    total,
    page,
    pageSize,
    facets: { categories: facetRes.rows.map((r) => ({ value: r.category as string, count: r.n as number })) },
  };
}

/** All categories with their dish counts — the browse landing. */
export async function getCategories(): Promise<{ category: string; count: number }[]> {
  const res = await getPool().query(
    `select category, count(distinct dish_id)::int as count
     from recipes where verified = true group by category order by count desc, category`,
  );
  return res.rows.map((r) => ({ category: r.category as string, count: r.count as number }));
}

/** One dish with its verified tier variants (ordered simple → moderate → complex). */
export async function getDish(dishId: string): Promise<{ dish: DishSummary; variants: RecipeSummary[] } | null> {
  const res = await getPool().query(
    `select ${SUMMARY_COLS} from recipes where verified = true and dish_id = $1`,
    [dishId],
  );
  if (!res.rows.length) return null;
  const variants = res.rows.map(rowToSummary).sort(byTier);
  return { dish: toDish(variants), variants };
}

/** The full RecipeGraph for one recipe — what the client adds to a meal and caches for offline cook. */
export async function getRecipe(recipeId: string): Promise<RecipeGraph | null> {
  const res = await getPool().query(`select graph from recipes where recipe_id = $1 and verified = true`, [recipeId]);
  return res.rows.length ? (res.rows[0].graph as RecipeGraph) : null;
}
