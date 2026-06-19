// Shared Supabase Postgres connection for the dev/admin DB scripts and the library API process.
// Run with tsx (these files are NOT part of the browser tsconfig graph, so Node-typed deps like
// `pg` stay out of the client typecheck). TLS is always on; chain verification is pinned to the
// Supabase CA when SUPABASE_CA_CERT is provided, with a clearly-logged relaxed fallback for dev.

import pg from "pg";
import { readFileSync } from "node:fs";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool) return pool;
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is not set — see apps/web/.env(.example)");

  // Fail closed: verify TLS by default. Either pin the Supabase CA (production) or *explicitly*
  // opt into unverified-but-encrypted TLS for dev — never silently downgrade.
  const caPath = process.env.SUPABASE_CA_CERT;
  let ssl: pg.PoolConfig["ssl"];
  if (caPath) {
    ssl = { ca: readFileSync(caPath, "utf8") }; // verified against the pinned Supabase CA
  } else if (process.env.ALLOW_INSECURE_TLS === "1") {
    console.warn(
      "[db] ALLOW_INSECURE_TLS=1 — TLS is ON (encrypted) but the certificate chain is NOT verified. " +
        "Dev only. Set SUPABASE_CA_CERT (download the Supabase CA) for verified TLS in production.",
    );
    ssl = { rejectUnauthorized: false };
  } else {
    throw new Error(
      "TLS not configured: set SUPABASE_CA_CERT to the Supabase CA cert for verified TLS, " +
        "or set ALLOW_INSECURE_TLS=1 to explicitly opt into unverified TLS for local dev.",
    );
  }

  pool = new pg.Pool({ connectionString, ssl, max: 4 });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}
