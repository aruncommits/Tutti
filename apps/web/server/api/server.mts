// Standalone Node HTTP server for the recipe library API. Kept out of the Vite/browser tsconfig graph
// (it uses `pg`); the Vite dev server proxies /api/library/* here (see vite.config.ts), and in
// production it deploys as its own service / serverless function. Run: `npm run dev:api -w apps/web`.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { searchDishes, getCategories, getDish, getRecipe } from "./library.mts";
import { closePool } from "../db/client.mts";

const PORT = Number(process.env.LIBRARY_API_PORT || 5181);

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "public, max-age=60");
  res.end(JSON.stringify(body));
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    if (req.method !== "GET") return send(res, 405, { error: "method-not-allowed" });
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const path = url.pathname;
    const sp = url.searchParams;

    if (path === "/api/library/categories") return send(res, 200, await getCategories());

    if (path === "/api/library/search") {
      return send(res, 200, await searchDishes({
        q: sp.get("q") ?? undefined,
        category: sp.get("category") ?? undefined,
        cuisine: sp.get("cuisine") ?? undefined,
        maxMins: sp.get("maxMins") ? Number(sp.get("maxMins")) : undefined,
        diets: sp.has("diet") ? sp.getAll("diet") : undefined,
        page: sp.get("page") ? Number(sp.get("page")) : undefined,
        pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
      }));
    }

    const dishMatch = path.match(/^\/api\/library\/dish\/(.+)$/);
    if (dishMatch) {
      const d = await getDish(decodeURIComponent(dishMatch[1]!));
      return d ? send(res, 200, d) : send(res, 404, { error: "not-found" });
    }

    const recipeMatch = path.match(/^\/api\/library\/recipe\/(.+)$/);
    if (recipeMatch) {
      const r = await getRecipe(decodeURIComponent(recipeMatch[1]!));
      return r ? send(res, 200, r) : send(res, 404, { error: "not-found" });
    }

    send(res, 404, { error: "not-found" });
  } catch (e) {
    send(res, 500, { error: "server-error", message: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(PORT, () => console.log(`[library-api] listening on http://localhost:${PORT}`));

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => { server.close(); void closePool().then(() => process.exit(0)); });
}
