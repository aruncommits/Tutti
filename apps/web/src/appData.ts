// Your-data helpers (Brief v22) — export and reset Tutti's local data. Pure over a storage-like
// interface so they're testable and so the privacy promise ("nothing leaves your device") is
// something the user can actually exercise. Only ever touches keys under the "tutti." namespace.

const PREFIX = "tutti.";

type KeyStore = { length: number; key(i: number): string | null };
type ReadStore = KeyStore & { getItem(k: string): string | null };
type WriteStore = KeyStore & { removeItem(k: string): void };

export function tuttiKeys(store: KeyStore): string[] {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  return keys.sort();
}

/** A pretty-printed JSON snapshot of all Tutti data, values parsed where possible. */
export function exportData(store: ReadStore): string {
  const out: Record<string, unknown> = {};
  for (const k of tuttiKeys(store)) {
    const raw = store.getItem(k);
    try {
      out[k] = raw === null ? null : JSON.parse(raw);
    } catch {
      out[k] = raw; // non-JSON value — keep as-is
    }
  }
  return JSON.stringify(out, null, 2);
}

/** Remove every Tutti key; returns the keys that were removed. */
export function resetData(store: WriteStore): string[] {
  const keys = tuttiKeys(store); // snapshot before mutating (length shifts as we remove)
  for (const k of keys) store.removeItem(k);
  return keys;
}
