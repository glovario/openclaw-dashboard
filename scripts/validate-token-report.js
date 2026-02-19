#!/usr/bin/env node
const baseUrl = process.env.DASHBOARD_BASE_URL || 'http://localhost:3420';
const apiKey = process.env.DASHBOARD_API_KEY;

if (!apiKey) {
  console.error('DASHBOARD_API_KEY is required');
  process.exit(1);
}

async function fetchJson(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'X-API-Key': apiKey }
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`Non-JSON response for ${path}: ${text.slice(0, 200)}`);
  }
  return { status: res.status, json };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const checks = [];

  const ok30 = await fetchJson('/api/reports/tokens?window=30');
  assert(ok30.status === 200, `expected 200 for window=30, got ${ok30.status}`);
  assert(ok30.json.ok === true, 'expected ok=true for window=30');
  ['totals', 'by_agent', 'by_task', 'by_model', 'trend'].forEach((k) => {
    assert(typeof ok30.json[k] !== 'undefined', `missing key ${k}`);
  });
  checks.push('window=30 baseline shape');

  const ok7NoUnlinked = await fetchJson('/api/reports/tokens?window=7&include_unlinked=false');
  assert(ok7NoUnlinked.status === 200, `expected 200 for include_unlinked=false, got ${ok7NoUnlinked.status}`);
  assert(ok7NoUnlinked.json.filters?.include_unlinked === false, 'include_unlinked filter not reflected');
  checks.push('window=7 include_unlinked=false filter');

  const custom = await fetchJson('/api/reports/tokens?start=2026-02-01T00:00:00Z&end=2026-02-19T23:59:59Z');
  assert(custom.status === 200, `expected 200 for custom start/end, got ${custom.status}`);
  assert(custom.json.window === 'custom', `expected window=custom, got ${custom.json.window}`);
  checks.push('custom start/end window');

  const bad = await fetchJson('/api/reports/tokens?window=14');
  assert(bad.status === 400, `expected 400 for invalid window, got ${bad.status}`);
  checks.push('invalid window rejected');

  console.log('PASS validate-token-report');
  checks.forEach((c) => console.log(` - ${c}`));
})().catch((err) => {
  console.error(`FAIL validate-token-report: ${err.message}`);
  process.exit(1);
});
