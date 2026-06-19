import type { CatalogEntry } from "../types";

// Popular Mediterranean / Levantine dishes.
const cui = "Mediterranean";

export const MEDITERRANEAN: CatalogEntry[] = [
  // Mezze / dips (Chutneys & Sauces)
  { dishId: "dish_hummus", name: "Hummus", category: "Chutneys & Sauces", cuisine: cui },
  { dishId: "dish_baba_ganoush", name: "Baba Ganoush", category: "Chutneys & Sauces", cuisine: cui },
  { dishId: "dish_tzatziki", name: "Tzatziki", category: "Chutneys & Sauces", cuisine: cui },
  { dishId: "dish_muhammara", name: "Muhammara", category: "Chutneys & Sauces", cuisine: cui },
  { dishId: "dish_labneh", name: "Labneh", category: "Chutneys & Sauces", cuisine: cui },
  { dishId: "dish_toum", name: "Toum (Garlic Sauce)", category: "Chutneys & Sauces", cuisine: cui },

  // Salads
  { dishId: "dish_greek_salad", name: "Greek Salad", category: "Salads", cuisine: cui },
  { dishId: "dish_tabbouleh", name: "Tabbouleh", category: "Salads", cuisine: cui },
  { dishId: "dish_fattoush", name: "Fattoush", category: "Salads", cuisine: cui },
  { dishId: "dish_shirazi_salad", name: "Shirazi Salad", category: "Salads", cuisine: cui },

  // Grills & Kebabs
  { dishId: "dish_chicken_shawarma", name: "Chicken Shawarma", category: "Grills & Kebabs", cuisine: cui },
  { dishId: "dish_lamb_shawarma", name: "Lamb Shawarma", category: "Grills & Kebabs", cuisine: cui },
  { dishId: "dish_chicken_souvlaki", name: "Chicken Souvlaki", category: "Grills & Kebabs", cuisine: cui },
  { dishId: "dish_shish_taouk", name: "Shish Taouk", category: "Grills & Kebabs", cuisine: cui },
  { dishId: "dish_adana_kebab", name: "Adana Kebab", category: "Grills & Kebabs", cuisine: cui },
  { dishId: "dish_lamb_kofta_kebab", name: "Lamb Kofta Kebab", category: "Grills & Kebabs", cuisine: cui },
  { dishId: "dish_souvlaki_pork", name: "Pork Souvlaki", category: "Grills & Kebabs", cuisine: cui },

  // Wraps
  { dishId: "dish_chicken_gyro", name: "Chicken Gyro Wrap", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_falafel_wrap", name: "Falafel Wrap", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_shawarma_wrap", name: "Beef Shawarma Wrap", category: "Tacos & Wraps", cuisine: cui },

  // Snacks & Starters
  { dishId: "dish_falafel", name: "Falafel", category: "Snacks & Starters", cuisine: cui },
  { dishId: "dish_dolma", name: "Dolma (Stuffed Grape Leaves)", category: "Snacks & Starters", cuisine: cui },
  { dishId: "dish_spanakopita", name: "Spanakopita", category: "Snacks & Starters", cuisine: cui },
  { dishId: "dish_borek", name: "Cheese Borek", category: "Snacks & Starters", cuisine: cui },
  { dishId: "dish_halloumi_fries", name: "Halloumi Fries", category: "Snacks & Starters", cuisine: cui },

  // Mains
  { dishId: "dish_moussaka", name: "Moussaka", category: "Mains", cuisine: cui },
  { dishId: "dish_lamb_tagine", name: "Lamb Tagine", category: "Mains", cuisine: cui },
  { dishId: "dish_gemista", name: "Gemista (Stuffed Vegetables)", category: "Mains", cuisine: cui },
  { dishId: "dish_chicken_kapama", name: "Chicken Kapama", category: "Mains", cuisine: cui },
  { dishId: "dish_paella", name: "Seafood Paella", category: "Rice", cuisine: cui },
  { dishId: "dish_mujadara", name: "Mujadara", category: "Rice", cuisine: cui },
  { dishId: "dish_koshari", name: "Koshari", category: "Rice", cuisine: cui },

  // Breads
  { dishId: "dish_pita_bread", name: "Pita Bread", category: "Breads", cuisine: cui },
  { dishId: "dish_manakish", name: "Manakish Za'atar", category: "Breads", cuisine: cui },

  // Soups & Stews
  { dishId: "dish_lentil_soup", name: "Mediterranean Lentil Soup", category: "Soups & Stews", cuisine: cui },
  { dishId: "dish_avgolemono", name: "Avgolemono Soup", category: "Soups & Stews", cuisine: cui },
  { dishId: "dish_harira", name: "Harira", category: "Soups & Stews", cuisine: cui },

  // Desserts
  { dishId: "dish_baklava", name: "Baklava", category: "Desserts", cuisine: cui },
  { dishId: "dish_knafeh", name: "Knafeh", category: "Desserts", cuisine: cui },
  { dishId: "dish_loukoumades", name: "Loukoumades", category: "Desserts", cuisine: cui },
  { dishId: "dish_halva", name: "Semolina Halva", category: "Desserts", cuisine: cui },
];
