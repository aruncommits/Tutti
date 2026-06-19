import type { CatalogEntry } from "../types";

// Popular Mexican dishes.
const cui = "Mexican";

export const MEXICAN: CatalogEntry[] = [
  // Tacos & Wraps
  { dishId: "dish_tacos_al_pastor", name: "Tacos al Pastor", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_carne_asada_tacos", name: "Carne Asada Tacos", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_carnitas_tacos", name: "Carnitas Tacos", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_baja_fish_tacos", name: "Baja Fish Tacos", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_chicken_tinga_tacos", name: "Chicken Tinga Tacos", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_beef_burrito", name: "Beef Burrito", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_bean_cheese_burrito", name: "Bean & Cheese Burrito", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_chicken_quesadilla", name: "Chicken Quesadilla", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_cheese_enchiladas", name: "Cheese Enchiladas", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_chicken_enchiladas", name: "Chicken Enchiladas Verdes", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_chicken_fajitas", name: "Chicken Fajitas", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_beef_fajitas", name: "Beef Fajitas", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_tostadas", name: "Tostadas", category: "Tacos & Wraps", cuisine: cui },
  { dishId: "dish_chimichanga", name: "Chimichanga", category: "Tacos & Wraps", cuisine: cui },

  // Salsas & dips (Chutneys & Sauces)
  { dishId: "dish_guacamole", name: "Guacamole", category: "Chutneys & Sauces", cuisine: cui },
  { dishId: "dish_salsa_roja", name: "Salsa Roja", category: "Chutneys & Sauces", cuisine: cui },
  { dishId: "dish_salsa_verde", name: "Salsa Verde", category: "Chutneys & Sauces", cuisine: cui },
  { dishId: "dish_pico_de_gallo", name: "Pico de Gallo", category: "Chutneys & Sauces", cuisine: cui },
  { dishId: "dish_mole_poblano", name: "Mole Poblano", category: "Chutneys & Sauces", cuisine: cui },

  // Soups & Stews
  { dishId: "dish_pozole_rojo", name: "Pozole Rojo", category: "Soups & Stews", cuisine: cui },
  { dishId: "dish_tortilla_soup", name: "Tortilla Soup", category: "Soups & Stews", cuisine: cui },
  { dishId: "dish_chili_con_carne", name: "Chili con Carne", category: "Soups & Stews", cuisine: cui },
  { dishId: "dish_birria", name: "Beef Birria", category: "Soups & Stews", cuisine: cui },
  { dishId: "dish_menudo", name: "Menudo", category: "Soups & Stews", cuisine: cui },

  // Mains
  { dishId: "dish_chiles_rellenos", name: "Chiles Rellenos", category: "Mains", cuisine: cui },
  { dishId: "dish_tamales", name: "Pork Tamales", category: "Mains", cuisine: cui },
  { dishId: "dish_carne_asada", name: "Carne Asada", category: "Mains", cuisine: cui },
  { dishId: "dish_cochinita_pibil", name: "Cochinita Pibil", category: "Mains", cuisine: cui },

  // Sides & Rice
  { dishId: "dish_mexican_rice", name: "Mexican Rice", category: "Rice", cuisine: cui },
  { dishId: "dish_refried_beans", name: "Refried Beans", category: "Dal & Lentils", cuisine: cui },
  { dishId: "dish_elote", name: "Elote (Mexican Street Corn)", category: "Snacks & Starters", cuisine: cui },

  // Snacks & Starters
  { dishId: "dish_nachos", name: "Loaded Nachos", category: "Snacks & Starters", cuisine: cui },
  { dishId: "dish_taquitos", name: "Taquitos", category: "Snacks & Starters", cuisine: cui },
  { dishId: "dish_queso_fundido", name: "Queso Fundido", category: "Snacks & Starters", cuisine: cui },

  // Desserts
  { dishId: "dish_churros", name: "Churros", category: "Desserts", cuisine: cui },
  { dishId: "dish_flan", name: "Mexican Flan", category: "Desserts", cuisine: cui },
  { dishId: "dish_tres_leches", name: "Tres Leches Cake", category: "Desserts", cuisine: cui },
  { dishId: "dish_sopapillas", name: "Sopapillas", category: "Desserts", cuisine: cui },

  // Drinks
  { dishId: "dish_horchata", name: "Horchata", category: "Drinks", cuisine: cui },
  { dishId: "dish_agua_fresca", name: "Agua Fresca", category: "Drinks", cuisine: cui },
];
