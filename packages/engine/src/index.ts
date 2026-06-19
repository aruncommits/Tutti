// Tutti engine public surface. Pure functions over plain data (Doc 2 §1).
// Implemented so far: the validation gate. The four scheduling functions
// (compile, deriveViewState, applyEvent, reschedule) are built by Brief v1.

export * from "./types";
export { validate, isAcyclic } from "./validate";
export { thaliV1, type SessionFixture } from "./golden";
export { goldenLibrary } from "./library";
export {
  topoSort,
  criticalPathMethod,
  scheduleForward,
  anchor,
  type CpmEntry,
  type CpmResult,
  type ForwardSchedule,
  type ForwardScheduleEntry,
  type AnchoredSchedule,
} from "./schedule";
export { parseClock, formatClock } from "./time";
export { compile, type PaceModel } from "./compile";
export { deriveViewState } from "./viewstate";
export { applyEvent } from "./events";
export { reschedule } from "./reschedule";
export { updatePace, applyPace, paceCategoryOf, type PaceSample } from "./pace";
export { scaleRecipe } from "./scale";
export { complexityOf, type Complexity } from "./complexity";
export { dishIdOf, tierOf, groupVariants, variantsForDish, type DishGroup } from "./variants";
export { lookupIngredient, gramsOf, ALL_INGREDIENTS, type IngredientInfo } from "./ingredients";
export { nutritionOf, mealNutrition, type NutritionEstimate } from "./nutrition";
export { DIETS, dietsOf, satisfiesDiets, type Diet } from "./diets";
export { AISLES, aisleOf, aisleOrder, type Aisle } from "./aisle";
export { buildShoppingList, normalizeIngredientName, type ShoppingItem } from "./shopping";
export { ALLERGENS, detectAllergens, allergensOf, type Allergen } from "./allergens";
export { HANDS, normalizeKitchen, nodeRequirements, capacityOf } from "./resources";
