import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validate,
  compile,
  applyEvent,
  reschedule,
  deriveViewState,
  isAcyclic,
  topoSort,
  criticalPathMethod,
  normalizeKitchen,
  nodeRequirements,
  capacityOf,
  parseClock,
  type KitchenProfile,
  type MasterExecutionPlan,
  type RecipeGraph,
  type TaskNode,
} from "../src/index";

const CATS = ["burner", "oven", "pan", "blender", "cutting_board"] as const;
const NOW = "08:00:00";
const TARGET = "20:00:00";

// ── Generators: random VALID (acyclic) graphs + feasible kitchens ────────────
// A node only depends on earlier-indexed nodes (depSeed bitmask) → guaranteed acyclic.
const nodeSpec = fc.record({
  phase: fc.constantFrom("prep", "cook", "serve"),
  attention: fc.constantFrom("active", "passive"),
  est: fc.integer({ min: 1, max: 20 }),
  elastic: fc.boolean(),
  cats: fc.subarray([...CATS]),
  depSeed: fc.nat({ max: 4095 }),
});

const arbGraph: fc.Arbitrary<RecipeGraph> = fc
  .array(nodeSpec, { minLength: 1, maxLength: 12 })
  .map((specs) => {
    const nodes: TaskNode[] = specs.map((s, i) => {
      const deps: string[] = [];
      for (let j = 0; j < i; j++) if ((s.depSeed >> j) & 1) deps.push(`n${j}`);
      return {
        nodeId: `n${i}`,
        recipeId: "gen",
        title: `task ${i}`,
        phase: s.phase,
        attention: s.attention,
        duration: { estMins: s.est, minMins: s.est, maxMins: s.est, elastic: s.elastic },
        ingredients: [],
        resources: s.cats.map((c) => ({ category: c, count: 1 })),
        dependencies: deps,
      };
    });
    return { recipeId: "gen", name: "Generated", version: 1, servings: 2, verified: false, nodes };
  });

const arbKitchen: fc.Arbitrary<KitchenProfile> = fc
  .record({
    cooks: fc.integer({ min: 1, max: 2 }),
    counts: fc.record(Object.fromEntries(CATS.map((c) => [c, fc.integer({ min: 1, max: 3 })])) as Record<string, fc.Arbitrary<number>>),
  })
  .map((k) => ({ cooks: k.cooks, resources: CATS.map((c) => ({ category: c, count: k.counts[c]! })) }));

/** Peak concurrent usage of a category across a plan's schedule (earliest offsets). */
function peak(plan: MasterExecutionPlan, category: string): number {
  const deltas: Array<[number, number]> = [];
  for (const n of plan.nodes) {
    const units = nodeRequirements(n).filter((r) => r.category === category).reduce((a, r) => a + r.count, 0);
    if (units === 0) continue;
    const e = plan.schedule[n.nodeId]!;
    deltas.push([e.earliestStart, units], [e.earliestStart + n.duration.estMins, -units]);
  }
  deltas.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0, mx = 0;
  for (const [, d] of deltas) { cur += d; if (cur > mx) mx = cur; }
  return mx;
}

describe("six engine invariants (Doc 2 §9) — property-based", () => {
  it("generated graphs are always valid (acyclic, refs resolve)", () => {
    fc.assert(fc.property(arbGraph, (g) => { expect(validate(g).ok).toBe(true); }), { numRuns: 80 });
  });

  it("inv1 acyclicity + inv3 resource feasibility + inv6 determinism after compile", () => {
    fc.assert(
      fc.property(arbGraph, arbKitchen, (g, kitchen) => {
        const plan = compile([g], kitchen, TARGET);
        // (1) acyclicity
        expect(isAcyclic(plan.nodes)).toBe(true);
        // (3) resource feasibility — no category exceeds capacity (incl. hands)
        const nk = normalizeKitchen(kitchen);
        for (const cat of [...CATS, "hands"]) {
          expect(peak(plan, cat)).toBeLessThanOrEqual(capacityOf(nk, cat));
        }
        // (6) determinism
        expect(compile([g], kitchen, TARGET)).toEqual(plan);
      }),
      { numRuns: 80 },
    );
  });

  it("inv2 dependency safety + inv4 monotonic progress over a completion stream", () => {
    fc.assert(
      fc.property(arbGraph, arbKitchen, (g, kitchen) => {
        let plan = compile([g], kitchen, TARGET);
        const order = topoSort(plan.nodes); // complete in a dependency-respecting order
        let completed = 0;
        for (const id of order) {
          // (2) every active node has all dependencies completed
          for (const a of deriveViewState(plan).active) {
            const done = new Set(plan.nodes.filter((n) => n.status === "completed").map((n) => n.nodeId));
            expect(a.dependencies.every((d) => done.has(d))).toBe(true);
          }
          plan = applyEvent(plan, { type: "complete", nodeId: id, at: NOW });
          const nowCompleted = plan.nodes.filter((n) => n.status === "completed").length;
          // (4) monotonic progress (no undo here → never decreases)
          expect(nowCompleted).toBeGreaterThanOrEqual(completed);
          completed = nowCompleted;
        }
      }),
      { numRuns: 60 },
    );
  });

  it("inv5 deadline honesty — projected serve >= now + remaining critical path", () => {
    fc.assert(
      fc.property(arbGraph, arbKitchen, (g, kitchen) => {
        const plan = reschedule(compile([g], kitchen, TARGET), NOW);
        const remaining = plan.nodes.filter((n) => n.status !== "completed");
        const floor = parseClock(NOW) + criticalPathMethod(remaining).makespanMins;
        expect(parseClock(plan.projectedServeTime)).toBeGreaterThanOrEqual(floor);
      }),
      { numRuns: 80 },
    );
  });

  it("simulation: out-of-order completion never breaks acyclicity or dependency safety", () => {
    fc.assert(
      fc.property(arbGraph, arbKitchen, fc.array(fc.nat(), { maxLength: 20 }), (g, kitchen, picks) => {
        let plan = compile([g], kitchen, TARGET);
        for (const pick of picks) {
          const candidates = plan.nodes.filter((n) => n.status !== "completed");
          if (!candidates.length) break;
          const node = candidates[pick % candidates.length]!; // possibly out of dependency order
          plan = applyEvent(plan, { type: "complete", nodeId: node.nodeId, at: NOW });
          expect(isAcyclic(plan.nodes)).toBe(true);
          const done = new Set(plan.nodes.filter((n) => n.status === "completed").map((n) => n.nodeId));
          for (const a of deriveViewState(plan).active) {
            expect(a.dependencies.every((d) => done.has(d))).toBe(true);
          }
        }
      }),
      { numRuns: 60 },
    );
  });
});
