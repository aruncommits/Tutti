import type { Plugin } from "vite";
import { routeRecipe, configuredProviders, type Keys } from "./aiRouter";

// Dev-time AI endpoint: a Vite middleware so we need no extra deps or separate process. The provider
// keys live HERE (server-side, from a gitignored .env) — never in the client bundle. In production
// the same routeRecipe() drops into a serverless function; this plugin is the dev/test host.
//
// Endpoints:
//   GET  /api/usage   -> { providers, used, free, remaining }   (no keys exposed)
//   POST /api/recipe  -> { text, model, provider, remaining }   (body: { prompt })
//
// Minimal request/response shapes so this file needs no @types/node (browser-only app tsconfig).
interface Req {
  url?: string;
  method?: string;
  on(event: string, cb: (chunk: string) => void): void;
  destroy(): void;
}
interface Res {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
}

function readJson(req: Req): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

export function aiApi(keys: Keys, freeLimit: number): Plugin {
  let used = 0; // simple in-memory stub; resets on restart. Real metering = billing later.
  return {
    name: "tutti-ai-api",
    configureServer(server) {
      const mw = server.middlewares as unknown as { use(fn: (req: Req, res: Res, next: () => void) => void): void };
      mw.use((req, res, next) => {
        const url = (req.url || "").split("?")[0] ?? "";
        if (!url.startsWith("/api/")) return next();
        res.setHeader("content-type", "application/json");

        if (url === "/api/usage") {
          res.end(JSON.stringify({ providers: configuredProviders(keys), used, free: freeLimit, remaining: Math.max(0, freeLimit - used) }));
          return;
        }

        if (url === "/api/recipe" && req.method === "POST") {
          void (async () => {
            const body = await readJson(req);
            const prompt = String(body.prompt ?? "").trim();
            if (!prompt) { res.statusCode = 400; res.end(JSON.stringify({ error: "empty", message: "Tell the AI what to cook." })); return; }
            if (configuredProviders(keys).length === 0) {
              res.statusCode = 503;
              res.end(JSON.stringify({ error: "no-ai", message: "AI isn't configured on this server yet — add a provider key to apps/web/.env." }));
              return;
            }
            if (used >= freeLimit) { res.statusCode = 429; res.end(JSON.stringify({ error: "quota", message: "You've used your free AI recipes for now." })); return; }
            try {
              const r = await routeRecipe(prompt, keys, "generate");
              used += 1;
              res.end(JSON.stringify({ text: r.text, model: r.model, provider: r.provider, remaining: Math.max(0, freeLimit - used) }));
            } catch (e) {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: "ai-failed", message: e instanceof Error ? e.message : "The AI request failed." }));
            }
          })();
          return;
        }
        next();
      });
    },
  };
}
