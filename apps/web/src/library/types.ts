import type { DishSummary, RecipeGraph, RecipeSummary } from "@tutti/engine";

// Client-side contract for the recipe catalog. The app reads recipes ONLY through a LibraryProvider,
// so the source (remote API, on-device cache, bundled offline starter) is swappable. Shapes mirror
// the server's /api/library/* responses (apps/web/server/api/library.mts).

export interface SearchParams {
  q?: string;
  category?: string;
  cuisine?: string;
  maxMins?: number;
  diets?: string[];
  page?: number;
  pageSize?: number;
}

/** Browse-landing shape: a category and how many dishes it has. */
export interface CategoryCount {
  category: string;
  count: number;
}

/** Facet shape inside a search result: a filter value and its match count. */
export interface FacetCount {
  value: string;
  count: number;
}

export interface SearchResult {
  dishes: DishSummary[];
  total: number; // distinct dishes matching, across all pages
  page: number;
  pageSize: number;
  facets: { categories: FacetCount[] };
}

export interface DishDetail {
  dish: DishSummary;
  variants: RecipeSummary[]; // ordered simple → moderate → complex
}

export interface LibraryProvider {
  getCategories(): Promise<CategoryCount[]>;
  searchDishes(params: SearchParams): Promise<SearchResult>;
  getDish(dishId: string): Promise<DishDetail | null>;
  /** The full graph (what's added to a meal + cached for offline cook). null if unknown. */
  getRecipe(recipeId: string): Promise<RecipeGraph | null>;
}
