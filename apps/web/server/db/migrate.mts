// Apply the recipe-library schema to Supabase. Idempotent. Run: `npm run db:migrate -w apps/web`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getPool, closePool } from "./client.mts";

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, "schema.sql"), "utf8");

const pool = getPool();
try {
  await pool.query(sql);
  console.log("migrate: schema applied ✓");
} catch (e) {
  console.error("migrate: FAILED", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await closePool();
}
