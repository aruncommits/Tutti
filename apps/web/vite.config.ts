import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Workspace packages (@tutti/engine, @tutti/ingest) are imported as TS source and transpiled by
// Vite — no separate build step in dev. Dedicated port + strictPort so a collision FAILS loudly.
// PWA: Tutti's cooking path is fully local, so it works offline once the assets are precached —
// the service worker is emitted on build (dev gate is unaffected). Realizes Doc 1 P4.
const PORT = 5180;
export default defineConfig({
  plugins: [
    react(),
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
});
