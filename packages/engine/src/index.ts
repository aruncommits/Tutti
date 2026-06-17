// Tutti engine public surface. Pure functions over plain data (Doc 2 §1).
// Implemented so far: the validation gate. The four scheduling functions
// (compile, deriveViewState, applyEvent, reschedule) are built by Brief v1.

export * from "./types";
export { validate, isAcyclic } from "./validate";
export { thaliV1, type SessionFixture } from "./golden";
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
export { buildShoppingList, normalizeIngredientName, type ShoppingItem } from "./shopping";
export { HANDS, normalizeKitchen, nodeRequirements, capacityOf } from "./resources";
