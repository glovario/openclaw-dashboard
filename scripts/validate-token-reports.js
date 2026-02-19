#!/usr/bin/env node

/**
 * OC-036: lightweight contract + reconciliation validator for /api/reports/tokens
 *
 * Usage:
 *   DASHBOARD_URL=http://localhost:3420 \
 *   API_KEY=... \
 *   node scripts/validate-token-reports.js
 */

const BASE = process.env.DASHBOARD_URL || 'http://localhost:3420';
const API_KEY = process.env.API_KEY || process.env.OPENCLAW_DASHBOARD_API_KEY;

if (!API_KEY) {
  console.error('Missing API key: set API_KEY or OPENCLAW_DASHBOARD_API_KEY');
  process.exit(1);
}

const requiredTopLevel = ['ok', 'window', 'filters', 'totals', 'by_agent', 'by_task', 'by_model', 'trend'];
const requiredTotals = ['prompt_tokens', 'completion_tokens', 'total_tokens', 'cost_usd', 'unlinked_events', 'linked_events', 'event_count'];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-API-Key': API_KEY } });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

function validateShape(payload, label) {
  for (const k of requiredTopLevel) assert(Object.prototype.hasOwnProperty.call(payload, k), `${label}: missing key ${k}`);
  for (const k of requiredTotals) assert(Object.prototype.hasOwnProperty.call(payload.totals, k), `${label}: totals missing ${k}`);
  assert(payload.totals.linked_events + payload.totals.unlinked_events === payload.totals.event_count, `${label}: linked+unlinked != event_count`);
  for (const key of ['by_agent', 'by_task', 'by_model', 'trend']) {
    assert(Array.isArray(payload[key]), `${label}: ${key} is not array`);
  }
}

function isSortedDesc(rows) {
  for (let i = 1; i < rows.length; i += 1) {
    const prev = Number(rows[i - 1].cost_usd || 0);
    const curr = Number(rows[i].cost_usd || 0);
    if (curr > prev) return false;
    if (curr === prev) {
      const prevT = Number(rows[i - 1].total_tokens || 0);
      const currT = Number(rows[i].total_tokens || 0);
      if (currT > prevT) return false;
    }
  }
  return true;
}

async function main() {
  const runs = [
    { label: 'window=7', path: '/api/reports/tokens?window=7' },
    { label: 'window=30', path: '/api/reports/tokens?window=30' },
    { label: 'window=90', path: '/api/reports/tokens?window=90' },
    { label: 'window=30&include_unlinked=false', path: '/api/reports/tokens?window=30&include_unlinked=false' },
  ];

  const output = [];
  for (const run of runs) {
    const data = await getJson(run.path);
    validateShape(data, run.label);
    assert(isSortedDesc(data.by_agent), `${run.label}: by_agent not sorted`);
    assert(isSortedDesc(data.by_task), `${run.label}: by_task not sorted`);
    assert(isSortedDesc(data.by_model), `${run.label}: by_model not sorted`);

    if (run.path.includes('include_unlinked=false')) {
      assert(Number(data.totals.unlinked_events) === 0, `${run.label}: unlinked_events should be 0`);
    }

    output.push({
      case: run.label,
      ok: true,
      events: data.totals.event_count,
      cost_usd: data.totals.cost_usd,
    });
  }

  console.log(JSON.stringify({ ok: true, base: BASE, checks: output }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  process.exit(2);
});
