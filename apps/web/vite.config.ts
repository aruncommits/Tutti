import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { aiApi } from "./server/aiPlugin";

// Workspace packages (@tutti/engine, @tutti/ingest) are imported as TS source and transpiled by
// Vite — no separate build step in dev. Dedicated port + strictPort so a collision FAILS loudly.
// PWA: Tutti's cooking path is fully local, so it works offline once the assets are precached —
// the service worker is emitted on build (dev gate is unaffected). Realizes Doc 1 P4.
const PORT = 5180;
export default defineConfig(({ mode }) => {
  // App-provided AI keys live in a gitignored .env (server-side only — prefix "" loads non-VITE_
  // vars so they never reach the client bundle). See .env.example.
  const env = loadEnv(mode, ".", "");
  const aiKeys = {
    openai: env.OPENAI_API_KEY || undefined,
    anthropic: env.ANTHROPIC_API_KEY || undefined,
    google: env.GOOGLE_API_KEY || env.GEMINI_API_KEY || undefined,
  };
  const aiFreeLimit = Number(env.AI_FREE_LIMIT || "20");
  // Secure-by-default (Brief v40): the paid AI endpoint is localhost-only unless AI_ALLOW_LAN is set
  // (e.g. to test "Ask AI" on a phone over the LAN); AI_DEV_TOKEN then requires an x-dev-token header.
  const aiAllowLan = /^(1|true|yes)$/i.test(env.AI_ALLOW_LAN || "");
  const aiDevToken = env.AI_DEV_TOKEN || undefined;
  return {
  plugins: [
    react(),
    aiApi(aiKeys, aiFreeLimit, { allowLan: aiAllowLan, expectedToken: aiDevToken }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Tutti",
        short_name: "Tutti",
        description: "Cook a whole multi-dish meal like a pro kitchen — every dish hot, at the same time.",
        theme_color: "#0d0b13",
        background_color: "#0d0b13",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,woff2,png}"] },
    }),
  ],
  server: { port: PORT, strictPort: true, host: true },
  preview: { port: PORT, strictPort: true, host: true },
  };
});
