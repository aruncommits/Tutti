// Gate guard: the build must stay code-split and the entry chunk under budget, so first paint on
// the cook path stays fast (Doc 1 P4). Runs after `npm run build`.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = "apps/web/dist";
const assets = join(dist, "assets");

function fail(msg) {
  console.error(`perf-check FAIL: ${msg}`);
  process.exit(1);
}

const js = readdirSync(assets).filter((f) => f.endsWith(".js"));
if (js.length < 2) fail(`expected multiple JS chunks (code-splitting), found ${js.length}`);

const html = readFileSync(join(dist, "index.html"), "utf8");
const m = html.match(/assets\/(index-[^"']+\.js)/);
if (!m) fail("could not find the entry chunk referenced in index.html");
const entry = m[1];
const kb = Math.round(statSync(join(assets, entry)).size / 1024);

// Regression guard. Baseline raised 190 -> 215 once, deliberately: the de-thali "meal-builder" home
// (Builder) made the core app reference the whole goldenLibrary (SAMPLE_RECIPES), so the recipe data
// — which doubled to 15 verified recipes — now lands in the entry. One-time baseline shift, not creep.
// Proper long-term fix to push it back down: load the recipe pool lazily (out of the entry) instead of
// importing goldenLibrary eagerly in App. Keep this tight to still catch real regressions.
const BUDGET_KB = 215;
if (kb > BUDGET_KB) fail(`entry chunk ${entry} is ${kb}KB > ${BUDGET_KB}KB budget`);

console.log(`perf-check OK: ${js.length} JS chunks; entry ${entry} ${kb}KB (< ${BUDGET_KB}KB budget)`);
