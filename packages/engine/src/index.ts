// Tutti engine public surface. Pure functions over plain data (Doc 2 §1).
// Implemented so far: the validation gate. The four scheduling functions
// (compile, deriveViewState, applyEvent, reschedule) are built by Brief v1.

export * from "./types";
export { validate, isAcyclic } from "./validate";
export { thaliV1, type SessionFixture } from "./golden";
export {
  topoSort,
  criticalPathMethod,
  type CpmEntry,
  type CpmResult,
} from "./schedule";
