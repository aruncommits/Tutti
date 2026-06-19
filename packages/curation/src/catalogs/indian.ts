import type { CatalogEntry } from "../types";

// Popular Indian dishes (beyond biryani). Mixed North/South; categories from the engine vocabulary.
export const INDIAN: CatalogEntry[] = [
  // Curries & Gravies
  { dishId: "dish_butter_chicken", name: "Butter Chicken", category: "Curries & Gravies", cuisine: "North Indian" },
  { dishId: "dish_chicken_tikka_masala", name: "Chicken Tikka Masala", category: "Curries & Gravies", cuisine: "North Indian" },
  { dishId: "dish_paneer_butter_masala", name: "Paneer Butter Masala", category: "Curries & Gravies", cuisine: "North Indian" },
  { dishId: "dish_palak_paneer", name: "Palak Paneer", category: "Curries & Gravies", cuisine: "North Indian" },
  { dishId: "dish_kadai_paneer", name: "Kadai Paneer", category: "Curries & Gravies", cuisine: "North Indian" },
  { dishId: "dish_malai_kofta", name: "Malai Kofta", category: "Curries & Gravies", cuisine: "North Indian" },
  { dishId: "dish_chana_masala", name: "Chana Masala", category: "Curries & Gravies", cuisine: "North Indian" },
  { dishId: "dish_rajma_masala", name: "Rajma Masala", category: "Curries & Gravies", cuisine: "North Indian" },
  { dishId: "dish_chicken_curry", name: "Indian Chicken Curry", category: "Curries & Gravies", cuisine: "Indian" },
  { dishId: "dish_rogan_josh", name: "Rogan Josh", category: "Curries & Gravies", cuisine: "North Indian" },
  { dishId: "dish_chicken_chettinad", name: "Chicken Chettinad", category: "Curries & Gravies", cuisine: "South Indian" },
  { dishId: "dish_fish_curry", name: "Kerala Fish Curry", category: "Curries & Gravies", cuisine: "South Indian" },
  { dishId: "dish_aloo_gobi", name: "Aloo Gobi", category: "Sides & Stir-fries", cuisine: "North Indian" },
  { dishId: "dish_bhindi_masala", name: "Bhindi Masala", category: "Sides & Stir-fries", cuisine: "North Indian" },

  // Dal & Lentils
  { dishId: "dish_dal_makhani", name: "Dal Makhani", category: "Dal & Lentils", cuisine: "North Indian" },
  { dishId: "dish_dal_fry", name: "Dal Fry", category: "Dal & Lentils", cuisine: "North Indian" },
  { dishId: "dish_sambar", name: "Sambar", category: "Dal & Lentils", cuisine: "South Indian" },
  { dishId: "dish_chole", name: "Chole (Chickpea Curry)", category: "Dal & Lentils", cuisine: "North Indian" },

  // Grills & Kebabs
  { dishId: "dish_chicken_tikka", name: "Chicken Tikka", category: "Grills & Kebabs", cuisine: "North Indian" },
  { dishId: "dish_tandoori_chicken", name: "Tandoori Chicken", category: "Grills & Kebabs", cuisine: "North Indian" },
  { dishId: "dish_seekh_kebab", name: "Seekh Kebab", category: "Grills & Kebabs", cuisine: "North Indian" },
  { dishId: "dish_paneer_tikka", name: "Paneer Tikka", category: "Grills & Kebabs", cuisine: "North Indian" },

  // Breads
  { dishId: "dish_butter_naan", name: "Butter Naan", category: "Breads", cuisine: "North Indian" },
  { dishId: "dish_garlic_naan", name: "Garlic Naan", category: "Breads", cuisine: "North Indian" },
  { dishId: "dish_aloo_paratha", name: "Aloo Paratha", category: "Breads", cuisine: "North Indian" },
  { dishId: "dish_roti", name: "Roti (Chapati)", category: "Breads", cuisine: "Indian" },
  { dishId: "dish_kulcha", name: "Amritsari Kulcha", category: "Breads", cuisine: "North Indian" },

  // Snacks & Starters
  { dishId: "dish_samosa", name: "Veg Samosa", category: "Snacks & Starters", cuisine: "Indian" },
  { dishId: "dish_pakora", name: "Onion Pakora", category: "Snacks & Starters", cuisine: "Indian" },
  { dishId: "dish_pani_puri", name: "Pani Puri (Golgappa)", category: "Snacks & Starters", cuisine: "Indian" },
  { dishId: "dish_aloo_tikki", name: "Aloo Tikki", category: "Snacks & Starters", cuisine: "North Indian" },
  { dishId: "dish_pav_bhaji", name: "Pav Bhaji", category: "Snacks & Starters", cuisine: "Indian" },
  { dishId: "dish_vada_pav", name: "Vada Pav", category: "Snacks & Starters", cuisine: "Indian" },

  // Breakfast & Tiffin
  { dishId: "dish_masala_dosa", name: "Masala Dosa", category: "Breakfast & Tiffin", cuisine: "South Indian" },
  { dishId: "dish_idli", name: "Idli", category: "Breakfast & Tiffin", cuisine: "South Indian" },
  { dishId: "dish_medu_vada", name: "Medu Vada", category: "Breakfast & Tiffin", cuisine: "South Indian" },
  { dishId: "dish_poha", name: "Poha", category: "Breakfast & Tiffin", cuisine: "Indian" },
  { dishId: "dish_upma", name: "Rava Upma", category: "Breakfast & Tiffin", cuisine: "South Indian" },

  // Desserts
  { dishId: "dish_gulab_jamun", name: "Gulab Jamun", category: "Desserts", cuisine: "Indian" },
  { dishId: "dish_jalebi", name: "Jalebi", category: "Desserts", cuisine: "Indian" },
  { dishId: "dish_gajar_halwa", name: "Gajar Ka Halwa", category: "Desserts", cuisine: "North Indian" },
  { dishId: "dish_rasmalai", name: "Rasmalai", category: "Desserts", cuisine: "Indian" },
  { dishId: "dish_kheer", name: "Rice Kheer", category: "Desserts", cuisine: "Indian" },

  // Drinks
  { dishId: "dish_mango_lassi", name: "Mango Lassi", category: "Drinks", cuisine: "Indian" },
  { dishId: "dish_masala_chai", name: "Masala Chai", category: "Drinks", cuisine: "Indian" },
];
