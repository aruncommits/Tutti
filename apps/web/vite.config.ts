import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Workspace packages (@tutti/engine, @tutti/ingest) are imported as TS source and
// transpiled by Vite — no separate build step in dev. Keeps the loop fast.
// Dedicated port + strictPort so a collision FAILS loudly (never silently serves
// someone else's app — the gate must trust what it smoke-tests).
const PORT = 5180;
export default defineConfig({
  plugins: [react()],
  server: { port: PORT, strictPort: true, host: true },
  preview: { port: PORT, strictPort: true, host: true },
});
