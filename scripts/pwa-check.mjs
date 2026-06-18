// Gate assertion: the production build must emit a PWA manifest + service worker, so Tutti is
// installable and works offline (Doc 1 P4). Runs after `npm run build`.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = "apps/web/dist";
const manifest = join(dist, "manifest.webmanifest");

if (!existsSync(manifest)) {
  console.error(`pwa-check FAIL: ${manifest} not emitted`);
  process.exit(1);
}
const files = existsSync(dist) ? readdirSync(dist) : [];
const sw = files.find((f) => /^(sw|registerSW)\.js$/.test(f) || f === "sw.js");
if (!sw) {
  console.error("pwa-check FAIL: no service worker (sw.js) in dist");
  process.exit(1);
}
console.log(`pwa-check OK: manifest.webmanifest + ${sw}`);
