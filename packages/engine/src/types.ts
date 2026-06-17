// Tutti engine — core domain model (Doc 2 §2). Pure data, no behavior, no LLM, no UI.

export type Phase = "prep" | "cook" | "serve";
export type Attention = "active" | "passive";
export type NodeStatus = "locked" | "active" | "completed";

export interface Duration {
  estMins: number;
  minMins: number;
  maxMins: number;
  /** true = scales with the cook's pace (chopping); false = fixed physics (a 15-min simmer). */
  elastic: boolean;
}

export interface Ingredient {
  name: string;
  amount?: number;
  unit?: string;
  preparedState?: string;
}

export type HeldFor = "duration";

export interface ResourceRequirement {
  category: string; // "burner" | "oven" | "pan" | "hands" | ...
  count: number;
  capabilities?: string[];
  heldFor?: HeldFor;
}

export interface TaskNode {
  nodeId: string;
  recipeId: string;
  title: string;
  instruction?: string;
  phase: Phase;
  attention: Attention;
  duration: Duration;
  ingredients: Ingredient[];
  resources: ResourceRequirement[];
  dependencies: string[];
  /** runtime-only; library content must not set this. */
  status?: NodeStatus;
  reviewerNote?: string;
  /** optional explicit pace-learning category (chop, saute, …); derived from the title if absent. */
  paceCategory?: string;
  /** set by scaleRecipe() when a node holds an ingredient scaled non-linearly (season to taste). */
  scaleNote?: string;
}

export interface RecipeGraph {
  recipeId: string;
  name: string;
  version: number;
  servings: number;
  verified: boolean;
  cuisine?: string;
  source?: string;
  /** explicit allergen tags (14 EU vocabulary); when absent, detectAllergens() infers them. */
  allergens?: string[];
  nodes: TaskNode[];
}

// Layered resource model (Doc 2 §2.3): Level 0 counts, Level 1 capabilities, Level 2 instances.
export interface ResourcePool {
  category: string;
  count?: number;
  capabilities?: string[];
  instances?: Array<{ id: string; capabilities: string[] }>;
}

export interface KitchenProfile {
  cooks: number;
  resources: ResourcePool[];
}

export interface ScheduleEntry {
  plannedStart: string; // HH:MM:SS
  plannedEnd: string;
  earliestStart: number; // minutes from t0
  latestStart: number;
  slackMins: number;
}

export interface MasterExecutionPlan {
  sessionId: string;
  targetServeTime: string;
  startTime: string;
  kitchenProfile: KitchenProfile;
  nodes: TaskNode[];
  criticalPathMins: number;
  criticalPath: string[];
  projectedServeTime: string;
  schedule: Record<string, ScheduleEntry>;
  /** set by reschedule(): e.g. "Start Fry brinjals in 3 min to stay on time", or null. */
  nextStartAlert?: string | null;
  /** set by reschedule(): true when the projected serve time has slipped past the target. */
  runningLate?: boolean;
}

export interface ViewState {
  active: TaskNode[];
  queue: TaskNode[];
  archive: TaskNode[];
  projectedServeTime: string;
  nextStartAlert: string | null;
}

export type CookEvent =
  | { type: "complete"; nodeId: string; at: string }
  | { type: "start"; nodeId: string; at: string }
  | { type: "undo"; nodeId: string; at: string };

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
