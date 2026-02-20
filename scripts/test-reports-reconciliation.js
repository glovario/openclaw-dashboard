#!/usr/bin/env node
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const repoRoot = path.resolve(__dirname, '..');
const tmpDir = path.join(repoRoot, '.tmp');
const dbPath = path.join(tmpDir, `reports-reconcile-${Date.now()}.db`);

async function waitForServer(baseUrl, headers, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/health`, { headers });
      if (res.ok) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Server did not become ready in time');
}

async function api(baseUrl, key, endpoint, method = 'GET', body) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data };
}

function sum(rows, key) {
  return rows.reduce((acc, row) => acc + Number(row[key] || 0), 0);
}

async function main() {
  fs.mkdirSync(tmpDir, { recursive: true });

  const port = 3521;
  const apiKey = 'test-key-reports-reconcile';
  const env = {
    ...process.env,
    PORT: String(port),
    DASHBOARD_API_KEY: apiKey,
    DB_PATH: dbPath,
  };

  process.env.DB_PATH = dbPath;
  const db = require(path.join(repoRoot, 'src/db'));
  await db.getDb();

  db.insert(
    `INSERT INTO tasks (title, description, status, owner, priority, estimated_token_effort, display_id, created_by)
     VALUES ('Recon task A', 'seed', 'in-progress', 'mason', 'medium', 'small', 'OC-991', 'reconcile-test')`
  );
  db.insert(
    `INSERT INTO tasks (title, description, status, owner, priority, estimated_token_effort, display_id, created_by)
     VALUES ('Recon task B', 'seed', 'in-progress', 'malik', 'medium', 'small', 'OC-992', 'reconcile-test')`
  );

  const taskA = db.get(`SELECT id FROM tasks WHERE display_id='OC-991'`);
  const taskB = db.get(`SELECT id FROM tasks WHERE display_id='OC-992'`);

  const now = Date.now();
  const events = [
    {
      ts: new Date(now - 2 * 86400000).toISOString(),
      source: 'reconcile-test',
      task_id: taskA.id,
      agent: 'mason',
      model: 'sonnet',
      prompt_tokens: 200,
      completion_tokens: 100,
      total_tokens: 300,
      cost_usd: 0.006,
      event_uid: 'rec-evt-1',
      metadata_json: { k: 1 },
    },
    {
      ts: new Date(now - 86400000).toISOString(),
      source: 'reconcile-test',
      task_id: taskB.id,
      agent: 'malik',
      model: 'opus',
      prompt_tokens: 120,
      completion_tokens: 60,
      total_tokens: 180,
      cost_usd: 0.009,
      event_uid: 'rec-evt-2',
      metadata_json: { k: 2 },
    },
    {
      ts: new Date(now - 86400000).toISOString(),
      source: 'reconcile-test',
      task_id: null,
      agent: 'unknown',
      model: 'sonnet',
      prompt_tokens: 40,
      completion_tokens: 20,
      total_tokens: 60,
      cost_usd: 0.0012,
      event_uid: 'rec-evt-3',
      metadata_json: { k: 3 },
    },
  ];

  for (const event of events) {
    db.insert(
      `INSERT INTO token_usage_events
        (ts, source, task_id, agent, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, event_uid, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.ts,
        event.source,
        event.task_id,
        event.agent,
        event.model,
        event.prompt_tokens,
        event.completion_tokens,
        event.total_tokens,
        event.cost_usd,
        event.event_uid,
        JSON.stringify(event.metadata_json || {}),
      ]
    );
  }

  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: repoRoot,
    env,
    stdio: 'pipe',
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}`, { 'X-API-Key': apiKey });
    const baseUrl = `http://127.0.0.1:${port}`;

    const sqlTotalsAll = db.get(
      `SELECT
         COUNT(*) AS events,
         COALESCE(SUM(prompt_tokens),0) AS prompt_tokens,
         COALESCE(SUM(completion_tokens),0) AS completion_tokens,
         COALESCE(SUM(total_tokens),0) AS total_tokens,
         COALESCE(SUM(cost_usd),0) AS cost_usd,
         SUM(CASE WHEN task_id IS NULL THEN 1 ELSE 0 END) AS unlinked_events
       FROM token_usage_events`
    );

    const { res: reportAllRes, data: reportAll } = await api(baseUrl, apiKey, '/api/reports/tokens?window=30&include_unlinked=true');
    assert.equal(reportAllRes.status, 200);
    assert.equal(reportAll.totals.event_count, Number(sqlTotalsAll.events));
    assert.equal(reportAll.totals.prompt_tokens, Number(sqlTotalsAll.prompt_tokens));
    assert.equal(reportAll.totals.completion_tokens, Number(sqlTotalsAll.completion_tokens));
    assert.equal(reportAll.totals.total_tokens, Number(sqlTotalsAll.total_tokens));
    assert.equal(reportAll.totals.unlinked_events, Number(sqlTotalsAll.unlinked_events));
    assert.ok(Math.abs(reportAll.totals.cost_usd - Number(sqlTotalsAll.cost_usd)) < 1e-9);

    const { res: reportLinkedRes, data: reportLinked } = await api(baseUrl, apiKey, '/api/reports/tokens?window=30&include_unlinked=false');
    assert.equal(reportLinkedRes.status, 200);

    const sqlTotalsLinked = db.get(
      `SELECT
         COUNT(*) AS events,
         COALESCE(SUM(prompt_tokens),0) AS prompt_tokens,
         COALESCE(SUM(completion_tokens),0) AS completion_tokens,
         COALESCE(SUM(total_tokens),0) AS total_tokens,
         COALESCE(SUM(cost_usd),0) AS cost_usd
       FROM token_usage_events
       WHERE task_id IS NOT NULL`
    );

    assert.equal(reportLinked.totals.event_count, Number(sqlTotalsLinked.events));
    assert.equal(reportLinked.totals.total_tokens, Number(sqlTotalsLinked.total_tokens));
    assert.ok(Math.abs(reportLinked.totals.cost_usd - Number(sqlTotalsLinked.cost_usd)) < 1e-9);

    assert.equal(sum(reportAll.by_agent, 'total_tokens'), reportAll.totals.total_tokens);
    assert.equal(sum(reportAll.by_task, 'total_tokens'), reportAll.totals.total_tokens);
    assert.equal(sum(reportAll.by_model, 'total_tokens'), reportAll.totals.total_tokens);
    assert.equal(sum(reportLinked.by_task, 'total_tokens'), reportLinked.totals.total_tokens);

    console.log('✅ reports reconciliation tests passed');
  } finally {
    server.kill('SIGTERM');
    if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { force: true });
  }
}

main().catch((err) => {
  console.error('❌ reports reconciliation tests failed');
  console.error(err.stack || err.message || err);
  process.exit(1);
});
