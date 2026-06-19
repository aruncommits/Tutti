// Curation CLI. DRY RUN by default (no writes, no publish). PAID: generation calls the AI provider.
//   npm run curate -w packages/curation                 # dry run over the whole seed catalog
//   npm run curate -w packages/curation -- --limit=2    # dry run, first 2 dishes
//   npm run curate -w packages/curation -- --commit     # generate + write to staging (verified=false)
//   npm run curate -w packages/curation -- --commit --publish   # …and promote to live
//
// Requires a provider key in apps/web/.env (loaded via --env-file in the npm script).

import { SEED_CATALOG } from "./catalog";
import { curateCatalog } from "./pipeline";
import { createAiGenerator } from "./aiGenerator.mts";
import { createDbStore, publishStaged } from "./dbStore.mts";
import { closePool } from "../../../apps/web/server/db/client.mts";

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const publish = args.includes("--publish");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1])) : SEED_CATALOG.length;

if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_API_KEY) {
  console.error("No AI provider key in apps/web/.env (OPENAI/ANTHROPIC/GOOGLE) — cannot generate. Aborting.");
  process.exit(2);
}

const entries = SEED_CATALOG.slice(0, limit);
console.log(`${commit ? "COMMIT" : "DRY RUN"}: ${entries.length} dishes × up to 3 tiers${commit ? "" : " (no writes)"}`);

const report = await curateCatalog(entries, {
  generator: createAiGenerator(),
  store: createDbStore(),
  dryRun: !commit,
  log: (m) => console.log("  " + m),
});

console.log(`\ncreated=${report.created} skipped=${report.skipped} failed=${report.failed}`);
for (const o of report.outcomes.filter((x) => x.status === "invalid" || x.status === "error")) {
  console.log(`  ✗ ${o.dishId}:${o.tier} — ${o.status}: ${o.detail}`);
}

if (publish && commit) {
  const n = await publishStaged(entries.map((e) => e.dishId));
  console.log(`published ${n} recipes to live`);
} else if (publish) {
  console.log("(--publish ignored without --commit)");
}

await closePool();
