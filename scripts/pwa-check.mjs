// Gate assertion: the production build must emit a PWA manifest + service worker whose precache
// covers the app shell AND the self-hosted fonts, so Tutti is installable and genuinely works
// offline (Doc 1 P4 — the cooking path is already local). Runs after `npm run build`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = "apps/web/dist";
const manifest = join(dist, "manifest.webmanifest");

function fail(msg) {
  console.error(`pwa-check FAIL: ${msg}`);
  process.exit(1);
}

if (!existsSync(manifest)) fail(`${manifest} not emitted`);

const files = existsSync(dist) ? readdirSync(dist) : [];
const swName = files.find((f) => f === "sw.js" || f === "registerSW.js");
if (!swName) fail("no service worker (sw.js) in dist");

// The precache list lives in sw.js (workbox generateSW). Assert the shell + at least one font.
const sw = existsSync(join(dist, "sw.js")) ? readFileSync(join(dist, "sw.js"), "utf8") : "";
const needs = [
  ["index.html", /index\.html/],
  ["a CSS asset", /\.css/],
  ["a JS asset", /\.js/],
  ["a self-hosted font", /\.woff2/],
];
for (const [label, re] of needs) {
  if (!re.test(sw)) fail(`service worker precache is missing ${label} (offline would be incomplete)`);
}
const woff2 = (sw.match(/\.woff2/g) || []).length;
console.log(`pwa-check OK: manifest.webmanifest + ${swName}; precache covers shell + ${woff2} fonts (offline-ready)`);
