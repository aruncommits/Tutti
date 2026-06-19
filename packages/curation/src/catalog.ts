import type { CatalogEntry } from "./types";

// Seed catalog — the curated list of dishes to generate (each becomes a dish with simple/moderate/
// complex variants). This is where the long tail lives: "Biryani" is a CATEGORY holding many dishes,
// each generated at three tiers. Grow this list (AI-proposed → human-approved) to scale the library.

export const SEED_CATALOG: CatalogEntry[] = [
  // Biryani & Pulao — the "hundreds of biryanis" example, one dish each (×3 tiers).
  { dishId: "dish_hyderabadi_chicken_biryani", name: "Hyderabadi Chicken Dum Biryani", category: "Biryani & Pulao", cuisine: "Hyderabadi" },
  { dishId: "dish_ambur_mutton_biryani", name: "Ambur Mutton Biryani", category: "Biryani & Pulao", cuisine: "South Indian" },
  { dishId: "dish_thalassery_chicken_biryani", name: "Thalassery Chicken Biryani", category: "Biryani & Pulao", cuisine: "South Indian" },
  { dishId: "dish_vegetable_dum_biryani", name: "Vegetable Dum Biryani", category: "Biryani & Pulao", cuisine: "South Indian" },
  { dishId: "dish_egg_biryani", name: "Egg Biryani", category: "Biryani & Pulao", cuisine: "South Indian" },
  { dishId: "dish_kolkata_biryani", name: "Kolkata Chicken Biryani", category: "Biryani & Pulao", cuisine: "Bengali" },

  // Pasta & Noodles
  { dishId: "dish_spaghetti_carbonara", name: "Spaghetti Carbonara", category: "Pasta & Noodles", cuisine: "Italian" },
  { dishId: "dish_penne_arrabbiata", name: "Penne Arrabbiata", category: "Pasta & Noodles", cuisine: "Italian" },
  { dishId: "dish_fettuccine_alfredo", name: "Fettuccine Alfredo", category: "Pasta & Noodles", cuisine: "Italian" },
  { dishId: "dish_veg_hakka_noodles", name: "Veg Hakka Noodles", category: "Pasta & Noodles", cuisine: "East Asian" },
  { dishId: "dish_pad_thai", name: "Chicken Pad Thai", category: "Pasta & Noodles", cuisine: "Thai" },

  // Fried Rice (lives under the Rice category)
  { dishId: "dish_yangzhou_fried_rice", name: "Yangzhou Fried Rice", category: "Rice", cuisine: "East Asian" },
  { dishId: "dish_schezwan_fried_rice", name: "Schezwan Fried Rice", category: "Rice", cuisine: "East Asian" },
  { dishId: "dish_kimchi_fried_rice", name: "Kimchi Fried Rice", category: "Rice", cuisine: "Korean" },
  { dishId: "dish_thai_pineapple_fried_rice", name: "Thai Pineapple Fried Rice", category: "Rice", cuisine: "Thai" },
];
