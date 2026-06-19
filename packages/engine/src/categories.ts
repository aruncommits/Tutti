// Browse taxonomy for a library that grows to thousands of recipes: Category → Dish → tier-variant.
// A *category* is a broad bucket ("Biryani & Pulao", "Pasta & Noodles") holding hundreds of distinct
// dishes; a *dish* (dishId) holds at most one recipe per complexity tier; a *variant* is one tier of
// one dish. Authored `recipe.category` wins; until the library is fully migrated, categoryOf() infers
// a category from the recipe name so legacy/pasted/AI recipes still land somewhere sensible.
//
// RecipeSummary / DishSummary are the lightweight shapes the search API and browse UI use, so we
// never ship full task-graphs just to render a list (the whole point of a server-backed catalog).

import type { ComplexityTier, Course, RecipeGraph } from "./types";
import { dishIdOf, groupVariants, tierOf } from "./variants";
import { nutritionOf } from "./nutrition";
import { dietsOf } from "./diets";
import { allergensOf } from "./allergens";

/** Canonical category vocabulary. Authored recipes should use one of these; inference targets them. */
export const CATEGORIES = [
  "Biryani & Pulao",
  "Rice",
  "Pasta & Noodles",
  "Curries & Gravies",
  "Dal & Lentils",
  "Soups & Stews",
  "Breads",
  "Breakfast & Tiffin",
  "Sides & Stir-fries",
  "Salads",
  "Snacks & Starters",
  "Pizza",
  "Tacos & Wraps",
  "Grills & Kebabs",
  "Mains",
  "Chutneys & Sauces",
  "Desserts",
  "Drinks",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Name-based inference, evaluated top-to-bottom — order encodes precedence so the more specific or
// more "owning" reading wins (e.g. "Masala Chai" is a Drink before "masala" reads as a Curry; "Rice
// Kheer" is a Dessert before "rice" reads as Rice; "Biryani" before generic Rice).
const CATEGORY_RULES: [RegExp, Category][] = [
  [/biryani|biriyani|pulao|pulav|pilaf|pilau/i, "Biryani & Pulao"],
  [/pasta|spaghetti|penne|macaroni|lasagn|aglio|noodle|ramen|chow ?mein|hakka|udon|\bpho\b|ravioli|gnocchi|fettuccine|linguine|carbonara|bolognese|tortellini/i, "Pasta & Noodles"],
  [/pizza|calzone/i, "Pizza"],
  [/lassi|chai|\btea\b|coffee|juice|smoothie|milkshake|\bshake\b|sharbat|sherbet|cooler|horchata|agua fresca|margarita|mojito|\bdrink\b/i, "Drinks"],
  [/halwa|kheer|payasam|\bcake\b|pudding|ladoo|laddu|barfi|burfi|jamun|gulab|jalebi|ice ?cream|gelato|\bsweet\b|dessert|brownie|cookie|tiramisu|panna ?cotta|cannoli|baklava|knafeh|kunafa|churro|\bflan\b|tres leches/i, "Desserts"],
  [/dosa|idli|uttapam|appam|upma|poha|pongal|omelet|omelette|pancake|\btoast\b|tiffin|breakfast|cereal|oatmeal|\boats\b|porridge|granola|muesli|shakshuka/i, "Breakfast & Tiffin"],
  [/\broti\b|naan|paratha|paratta|poori|\bpuri\b|chapati|chapathi|kulcha|\bbread\b|\bpita\b|manakish|focaccia/i, "Breads"],
  [/taco|burrito|quesadilla|enchilada|fajita|tostada|chimichanga|\bgyro\b|\bwrap\b|kathi roll|frankie/i, "Tacos & Wraps"],
  [/kebab|kabab|shawarma|souvlaki|\bseekh\b|tandoori|satay|skewer|grilled|\bgrill\b|tikka(?! masala)/i, "Grills & Kebabs"],
  [/\bdal\b|\bdhal\b|lentil|sambar|sambhar|rasam|kootu|\bbean\b|rajma|chana|chickpea|refried/i, "Dal & Lentils"],
  [/\bsoup\b|\bstew\b|broth|shorba|chowder|pozole|birria|chili con|minestrone|ribollita|avgolemono/i, "Soups & Stews"],
  [/fried rice|\brice\b|khichdi|kichidi|risotto|paella/i, "Rice"],
  [/curry|gravy|masala|kuzhambu|korma|tikka|butter |kadai|kadhai|\bsabzi\b|\bsabji\b|paneer|kofta|rogan/i, "Curries & Gravies"],
  [/salad|\bslaw\b|raita|kachumber|tabbouleh|fattoush|panzanella|\bcaprese\b/i, "Salads"],
  [/samosa|pakora|pakoda|cutlet|tikki|\bbhaji\b|spring roll|\bvada\b|bonda|starter|appetiz|\bsnack\b|falafel|nachos|bruschetta|arancini|spanakopita|dolma|borek|empanada|taquito|elote/i, "Snacks & Starters"],
  [/parmigiana|parmesan|osso ?buco|saltimbocca|piccata|scaloppine|cacciatore|moussaka|relleno|tamale|carnitas|carne asada|schnitzel/i, "Mains"],
  [/poriyal|thoran|stir.?fry|\bfry\b|roast|\bside\b|gobi|aloo/i, "Sides & Stir-fries"],
  [/chutney|thogayal|\bpodi\b|\bdip\b|\bsauce\b|pickle|relish|guacamole|hummus|salsa|tzatziki|baba ?ganoush|muhammara|pico de gallo|\bmole\b/i, "Chutneys & Sauces"],
];

const isCategory = (v: unknown): v is Category => (CATEGORIES as readonly string[]).includes(v as string);

/** A recipe's browse category. Authored `category` wins; otherwise inferred from the name. */
export function categoryOf(recipe: RecipeGraph): Category {
  if (isCategory(recipe.category)) return recipe.category;
  for (const [re, cat] of CATEGORY_RULES) if (re.test(recipe.name)) return cat;
  return "Other";
}

/** Total hands-on + cook minutes (sum of node estimates) — the headline "how long" for a card. */
export const totalMinsOf = (r: RecipeGraph): number => r.nodes.reduce((s, n) => s + n.duration.estMins, 0);

/** A flat, list-friendly projection of one recipe — everything a card/filter needs, no task graph. */
export interface RecipeSummary {
  recipeId: string;
  dishId: string;
  name: string;
  category: Category;
  cuisine?: string;
  course?: Course;
  tier: ComplexityTier;
  variantLabel?: string;
  servings: number;
  diets: string[];
  allergens: string[];
  tags: string[];
  totalMins: number;
  kcal: number;
  protein: number;
  verified: boolean;
}

/** Project a full RecipeGraph down to its summary (derives category/tier/nutrition/diets/allergens). */
export function toSummary(recipe: RecipeGraph): RecipeSummary {
  const n = nutritionOf(recipe);
  return {
    recipeId: recipe.recipeId,
    dishId: dishIdOf(recipe),
    name: recipe.name,
    category: categoryOf(recipe),
    cuisine: recipe.cuisine,
    course: recipe.course,
    tier: tierOf(recipe),
    variantLabel: recipe.variantLabel,
    servings: recipe.servings,
    diets: dietsOf(recipe),
    allergens: allergensOf(recipe),
    tags: recipe.tags ?? [],
    totalMins: totalMinsOf(recipe),
    kcal: n.kcal,
    protein: n.protein,
    verified: recipe.verified,
  };
}

/** One browse card per dish — collapses a dish's tier variants into a single row (the fix for the
 *  "hundreds of biryanis" wall: discovery lists dishes, not every variant). */
export interface DishSummary {
  dishId: string;
  name: string;
  category: Category;
  cuisine?: string;
  course?: Course;
  /** available renditions, ordered simple → moderate → complex. */
  tiers: { tier: ComplexityTier; recipeId: string; totalMins: number; kcal: number }[];
  /** the elected default variant (verified moderate when present) — what the card represents. */
  defaultRecipeId: string;
}

/** Collapse a set of recipes into one DishSummary per dish, reusing the variant grouping/election. */
export function toDishSummaries(recipes: RecipeGraph[]): DishSummary[] {
  return groupVariants(recipes).map((g) => ({
    dishId: g.dishId,
    name: g.name,
    category: categoryOf(g.defaultRecipe),
    cuisine: g.defaultRecipe.cuisine,
    course: g.defaultRecipe.course,
    tiers: g.variants.map((v) => ({
      tier: tierOf(v),
      recipeId: v.recipeId,
      totalMins: totalMinsOf(v),
      kcal: nutritionOf(v).kcal,
    })),
    defaultRecipeId: g.defaultRecipe.recipeId,
  }));
}
