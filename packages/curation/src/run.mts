// Curation CLI.
//   npm run curate -w packages/curation                          # FREE dry run — counts only, no AI
//   npm run curate -w packages/curation -- --limit=3             # dry run, first 3 dishes
//   npm run curate -w packages/curation -- --commit              # generate to staging (Claude Code CLI)
//   npm run curate -w packages/curation -- --commit --publish    # …and promote to live
//   npm run curate -w packages/curation -- --commit --api        # use paid provider keys instead (prod)
//
// Generation runs through the local Claude Code CLI by default (no API keys). `--api` switches to the
// provider-key generator (for production). Dry run calls NO AI either way.

import { SEED_CATALOG } from "./catalog";
import { planCuration } from "./plan";
import { curateCatalog } from "./pipeline";
import { createAiGenerator } from "./aiGenerator.mts";
import { createClaudeGenerator, claudeUsage } from "./claudeGenerator.mts";
import { createDbStore, publishStaged } from "./dbStore.mts";
import { closePool } from "../../../apps/web/server/db/client.mts";

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const publish = args.includes("--publish");
const useApi = args.includes("--api"); // prod path: paid provider keys; default is the Claude Code CLI
const force = args.includes("--force"); // regenerate even if a (dishId,tier) already exists
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1])) : SEED_CATALOG.length;
const entries = SEED_CATALOG.slice(0, limit);

if (!commit) {
  // FREE dry run — no AI. Read existing (dish,tier) keys from the DB if available to show net new work.
  let existing = new Set<string>();
  try {
    existing = await createDbStore().existingKeys();
  } catch {
    console.log("(DB not reachable — showing full counts as if empty)\n");
  }
  const plan = planCuration(entries, existing);
  console.log(`DRY RUN — ${plan.totalDishes} dishes → ${plan.totalRecipes} recipes to generate ` +
    `(${plan.alreadyHave} already in DB). NO AI called, nothing written.\n`);
  console.log("By category:");
  for (const r of plan.byCategory) console.log(`  ${r.category.padEnd(20)} ${String(r.dishes).padStart(3)} dishes / ${r.recipes} recipes`);
  console.log("\nBy cuisine:");
  for (const r of plan.byCuisine) console.log(`  ${r.cuisine.padEnd(16)} ${String(r.dishes).padStart(3)} dishes / ${r.recipes} recipes`);
  console.log("\nTo generate (PAID): add a provider key to apps/web/.env, then re-run with --commit [--publish].");
  await closePool().catch(() => {});
  process.exit(0);
}

// --commit path
let generator;
if (useApi) {
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.error("--api set but no provider key in apps/web/.env (OPENAI/ANTHROPIC/GOOGLE). Aborting.");
    process.exit(2);
  }
  generator = createAiGenerator();
} else {
  generator = createClaudeGenerator(); // local Claude Code CLI — no API keys
}
console.log(`COMMIT via ${useApi ? "provider API" : "Claude Code CLI"}: generating ${entries.length} dishes × up to 3 tiers…`);
const report = await curateCatalog(entries, {
  generator,
  store: createDbStore(),
  dryRun: false,
  force,
  log: (m) => console.log("  " + m),
});
console.log(`\ncreated=${report.created} skipped=${report.skipped} failed=${report.failed}`);
for (const o of report.outcomes.filter((x) => x.status === "invalid" || x.status === "error")) {
  console.log(`  ✗ ${o.dishId}:${o.tier} — ${o.status}: ${o.detail}`);
}
if (!useApi) {
  const { byModel, realModels } = claudeUsage();
  console.log("\nClaude CLI usage by model:");
  let total = 0;
  let calls = 0;
  for (const [model, u] of Object.entries(byModel)) {
    total += u.costUsd;
    calls += u.calls;
    console.log(
      `  ${model.padEnd(8)} ${String(u.calls).padStart(4)} calls · $${u.costUsd.toFixed(4)} · ` +
        `${u.inputTokens.toLocaleString()} in + ${u.outputTokens.toLocaleString()} out · ${(u.ms / 1000).toFixed(0)}s`,
    );
  }
  console.log(`  TOTAL    ${String(calls).padStart(4)} calls · $${total.toFixed(4)}` + (calls ? ` ($${(total / calls).toFixed(4)}/call)` : ""));
  if (report.created > 0) {
    const dishesTouched = new Set(report.outcomes.filter((o) => o.status === "created").map((o) => o.dishId)).size;
    console.log(`  → $${(total / report.created).toFixed(4)}/recipe` + (dishesTouched ? ` · $${(total / dishesTouched).toFixed(4)}/dish` : ""));
  }
  if (realModels.length) console.log(`  (actual model ids: ${realModels.join(", ")})`);
}
if (publish) {
  const n = await publishStaged(entries.map((e) => e.dishId));
  console.log(`published ${n} recipes to live`);
}
await closePool();
