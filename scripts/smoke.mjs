// Cheap HTTP smoke for the gate. Confirms the dev/preview server is up AND that it is
// actually Tutti (not some other app that grabbed the port). Run after the server is up.
const url = process.env.TUTTI_URL || "http://localhost:5180";
try {
  const res = await fetch(url);
  const html = await res.text();
  if (!res.ok) {
    console.error(`smoke FAIL: ${url} returned ${res.status}`);
    process.exit(1);
  }
  if (!html.includes("Tutti")) {
    console.error(`smoke FAIL: ${url} is serving a different app (no "Tutti" in HTML)`);
    process.exit(1);
  }
  if (!html.includes('id="root"')) {
    console.error(`smoke FAIL: ${url} missing #root mount`);
    process.exit(1);
  }
  console.log(`smoke OK: ${url} (${res.status}) serving Tutti`);
} catch (err) {
  console.error(`smoke FAIL: cannot reach ${url} — ${err.message}`);
  process.exit(1);
}
