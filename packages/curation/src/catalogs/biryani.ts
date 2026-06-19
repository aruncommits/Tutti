import type { CatalogEntry } from "../types";

// Biryani & Pulao — the deep list (Arun's headline ask). Each becomes a dish with simple/moderate/
// complex variants. Names only; the AI writes the recipes at generate time.
const C = "Biryani & Pulao";

export const BIRYANI: CatalogEntry[] = [
  // Regional chicken & meat biryanis
  { dishId: "dish_hyderabadi_chicken_biryani", name: "Hyderabadi Chicken Dum Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_hyderabadi_mutton_biryani", name: "Hyderabadi Mutton Dum Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_lucknowi_chicken_biryani", name: "Lucknowi (Awadhi) Chicken Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_kolkata_chicken_biryani", name: "Kolkata Chicken Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_ambur_chicken_biryani", name: "Ambur Chicken Biryani", category: C, cuisine: "South Indian" },
  { dishId: "dish_ambur_mutton_biryani", name: "Ambur Mutton Biryani", category: C, cuisine: "South Indian" },
  { dishId: "dish_thalassery_chicken_biryani", name: "Thalassery Chicken Biryani", category: C, cuisine: "South Indian" },
  { dishId: "dish_dindigul_chicken_biryani", name: "Dindigul Thalappakatti Chicken Biryani", category: C, cuisine: "South Indian" },
  { dishId: "dish_malabar_chicken_biryani", name: "Malabar Chicken Biryani", category: C, cuisine: "South Indian" },
  { dishId: "dish_donne_chicken_biryani", name: "Donne Chicken Biryani", category: C, cuisine: "South Indian" },
  { dishId: "dish_bhatkali_chicken_biryani", name: "Bhatkali Chicken Biryani", category: C, cuisine: "South Indian" },
  { dishId: "dish_sindhi_chicken_biryani", name: "Sindhi Chicken Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_bombay_mutton_biryani", name: "Bombay Mutton Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_memoni_mutton_biryani", name: "Memoni Mutton Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_kalyani_beef_biryani", name: "Kalyani Beef Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_mughlai_chicken_biryani", name: "Mughlai Chicken Biryani", category: C, cuisine: "Indian" },

  // Seafood
  { dishId: "dish_prawn_biryani", name: "Prawn Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_fish_biryani", name: "Fish Biryani", category: C, cuisine: "Indian" },

  // Vegetarian / other
  { dishId: "dish_hyderabadi_veg_biryani", name: "Hyderabadi Vegetable Dum Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_veg_biryani", name: "Vegetable Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_paneer_biryani", name: "Paneer Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_mushroom_biryani", name: "Mushroom Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_egg_biryani", name: "Egg Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_soya_biryani", name: "Soya Chunk Biryani", category: C, cuisine: "Indian" },
  { dishId: "dish_jackfruit_biryani", name: "Kathal (Jackfruit) Biryani", category: C, cuisine: "Indian" },

  // Pulao / pilaf
  { dishId: "dish_kashmiri_pulao", name: "Kashmiri Pulao", category: C, cuisine: "Indian" },
  { dishId: "dish_matar_pulao", name: "Matar (Peas) Pulao", category: C, cuisine: "Indian" },
  { dishId: "dish_yakhni_pulao", name: "Yakhni Pulao", category: C, cuisine: "Indian" },
  { dishId: "dish_veg_pulao", name: "Vegetable Pulao", category: C, cuisine: "Indian" },
  { dishId: "dish_tahiri", name: "Tahiri (Spiced Veg Rice)", category: C, cuisine: "Indian" },
];
