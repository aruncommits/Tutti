import type { CatalogEntry } from "../types";

// Popular Italian dishes.
const cui = "Italian";

export const ITALIAN: CatalogEntry[] = [
  // Pasta & Noodles
  { dishId: "dish_spaghetti_carbonara", name: "Spaghetti Carbonara", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_spaghetti_bolognese", name: "Spaghetti Bolognese", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_cacio_e_pepe", name: "Cacio e Pepe", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_penne_arrabbiata", name: "Penne all'Arrabbiata", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_pasta_alla_norma", name: "Pasta alla Norma", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_aglio_e_olio", name: "Spaghetti Aglio e Olio", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_pesto_pasta", name: "Trofie al Pesto", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_fettuccine_alfredo", name: "Fettuccine Alfredo", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_bucatini_amatriciana", name: "Bucatini all'Amatriciana", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_spaghetti_vongole", name: "Spaghetti alle Vongole", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_spaghetti_puttanesca", name: "Spaghetti alla Puttanesca", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_lasagna_bolognese", name: "Lasagna alla Bolognese", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_ravioli_ricotta", name: "Ricotta & Spinach Ravioli", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_potato_gnocchi", name: "Potato Gnocchi", category: "Pasta & Noodles", cuisine: cui },
  { dishId: "dish_tortellini_panna", name: "Tortellini alla Panna", category: "Pasta & Noodles", cuisine: cui },

  // Pizza
  { dishId: "dish_pizza_margherita", name: "Pizza Margherita", category: "Pizza", cuisine: cui },
  { dishId: "dish_pizza_marinara", name: "Pizza Marinara", category: "Pizza", cuisine: cui },
  { dishId: "dish_pizza_diavola", name: "Pizza Diavola", category: "Pizza", cuisine: cui },
  { dishId: "dish_pizza_quattro_formaggi", name: "Pizza Quattro Formaggi", category: "Pizza", cuisine: cui },
  { dishId: "dish_pizza_quattro_stagioni", name: "Pizza Quattro Stagioni", category: "Pizza", cuisine: cui },
  { dishId: "dish_pizza_prosciutto_funghi", name: "Pizza Prosciutto e Funghi", category: "Pizza", cuisine: cui },

  // Rice
  { dishId: "dish_mushroom_risotto", name: "Mushroom Risotto", category: "Rice", cuisine: cui },
  { dishId: "dish_risotto_milanese", name: "Risotto alla Milanese", category: "Rice", cuisine: cui },
  { dishId: "dish_seafood_risotto", name: "Seafood Risotto", category: "Rice", cuisine: cui },

  // Soups & Stews
  { dishId: "dish_minestrone", name: "Minestrone Soup", category: "Soups & Stews", cuisine: cui },
  { dishId: "dish_ribollita", name: "Ribollita", category: "Soups & Stews", cuisine: cui },
  { dishId: "dish_pasta_e_fagioli", name: "Pasta e Fagioli", category: "Soups & Stews", cuisine: cui },

  // Salads
  { dishId: "dish_caprese_salad", name: "Caprese Salad", category: "Salads", cuisine: cui },
  { dishId: "dish_panzanella", name: "Panzanella", category: "Salads", cuisine: cui },

  // Snacks & Starters
  { dishId: "dish_bruschetta", name: "Tomato Bruschetta", category: "Snacks & Starters", cuisine: cui },
  { dishId: "dish_arancini", name: "Arancini", category: "Snacks & Starters", cuisine: cui },
  { dishId: "dish_garlic_bread", name: "Garlic Bread", category: "Snacks & Starters", cuisine: cui },
  { dishId: "dish_antipasto_platter", name: "Antipasto Platter", category: "Snacks & Starters", cuisine: cui },

  // Mains
  { dishId: "dish_chicken_parmigiana", name: "Chicken Parmigiana", category: "Mains", cuisine: cui },
  { dishId: "dish_eggplant_parmigiana", name: "Eggplant Parmigiana", category: "Mains", cuisine: cui },
  { dishId: "dish_osso_buco", name: "Osso Buco", category: "Mains", cuisine: cui },
  { dishId: "dish_saltimbocca", name: "Saltimbocca alla Romana", category: "Mains", cuisine: cui },
  { dishId: "dish_chicken_piccata", name: "Chicken Piccata", category: "Mains", cuisine: cui },
  { dishId: "dish_chicken_marsala", name: "Chicken Marsala", category: "Mains", cuisine: cui },
  { dishId: "dish_chicken_cacciatore", name: "Chicken Cacciatore", category: "Mains", cuisine: cui },

  // Desserts
  { dishId: "dish_tiramisu", name: "Tiramisu", category: "Desserts", cuisine: cui },
  { dishId: "dish_panna_cotta", name: "Panna Cotta", category: "Desserts", cuisine: cui },
  { dishId: "dish_cannoli", name: "Sicilian Cannoli", category: "Desserts", cuisine: cui },
  { dishId: "dish_affogato", name: "Affogato", category: "Desserts", cuisine: cui },
];
