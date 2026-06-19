// Curation CLI.
//   npm run curate -w packages/curation                          # FREE dry run — counts only, no AI
//   npm run curate -w packages/curation -- --limit=3             # dry run, first 3 dishes
//   npm run curate -w packages/curation -- --commit              # PAID: generate to staging
//   npm run curate -w packages/curation -- --commit --publish    # …and promote to live
//
// Dry run calls NO AI (it only reads existing keys from the DB, if reachable). Generation is PAID and
// needs a provider key in apps/web/.env (loaded via --env-file in the npm script).

import { SEED_CATALOG } from "./catalog";
import { planCuration } from "./plan";
import { curateCatalog } from "./pipeline";
import { createAiGenerator } from "./aiGenerator.mts";
import { createDbStore, publishStaged } from "./dbStore.mts";
import { closePool } from "../../../apps/web/server/db/client.mts";

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const publish = args.includes("--publish");
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

// --commit path (PAID)
if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_API_KEY) {
  console.error("No AI provider key in apps/web/.env (OPENAI/ANTHROPIC/GOOGLE) — cannot generate. Aborting.");
  process.exit(2);
}
console.log(`COMMIT: generating ${entries.length} dishes × up to 3 tiers (PAID)…`);
const report = await curateCatalog(entries, {
  generator: createAiGenerator(),
  store: createDbStore(),
  dryRun: false,
  log: (m) => console.log("  " + m),
});
console.log(`\ncreated=${report.created} skipped=${report.skipped} failed=${report.failed}`);
for (const o of report.outcomes.filter((x) => x.status === "invalid" || x.status === "error")) {
  console.log(`  ✗ ${o.dishId}:${o.tier} — ${o.status}: ${o.detail}`);
}
if (publish) {
  const n = await publishStaged(entries.map((e) => e.dishId));
  console.log(`published ${n} recipes to live`);
}
await closePool();
