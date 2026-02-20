#!/usr/bin/env node
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const repoRoot = path.resolve(__dirname, '..');
const tmpDir = path.join(repoRoot, '.tmp');
const dbPath = path.join(tmpDir, `reports-contract-${Date.now()}.db`);

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

async function main() {
  fs.mkdirSync(tmpDir, { recursive: true });

  const port = 3520;
  const apiKey = 'test-key-reports-contract';
  const env = {
    ...process.env,
    PORT: String(port),
    DASHBOARD_API_KEY: apiKey,
    DB_PATH: dbPath,
  };

  // Seed DB before server boot so endpoint reads deterministic fixtures.
  process.env.DB_PATH = dbPath;
  const db = require(path.join(repoRoot, 'src/db'));
  await db.getDb();
  db.insert(
    `INSERT INTO tasks
      (title, description, status, owner, priority, estimated_token_effort, display_id, created_by)
     VALUES ('Token reporting contract seed', 'contract test seed task', 'in-progress', 'malik', 'medium', 'small', 'OC-999', 'contract-test')`
  );
  const task = db.get(`SELECT id FROM tasks WHERE display_id = 'OC-999'`);
  const taskId = task.id;

  db.insert(
    `INSERT INTO tasks
      (title, description, status, owner, priority, estimated_token_effort, display_id, created_by)
     VALUES ('Deleted linkage seed', 'used to validate deleted-task fallback', 'done', 'ada', 'low', 'small', 'OC-998', 'contract-test')`
  );
  const deletedSeed = db.get(`SELECT id FROM tasks WHERE display_id = 'OC-998'`);
  const deletedTaskId = deletedSeed.id;
  db.run(`DELETE FROM tasks WHERE id = ?`, [deletedTaskId]);
  db.insert(
    `INSERT INTO token_usage_events
      (ts, source, task_id, agent, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, event_uid, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      new Date(Date.now() - 86400000).toISOString(),
      'contract-test',
      deletedTaskId,
      'ada',
      'sonnet',
      40,
      20,
      60,
      0.0012,
      'evt-deleted-task-1',
      JSON.stringify({ kind: 'deleted-task-fallback' }),
    ]
  );

  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: repoRoot,
    env,
    stdio: 'pipe',
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}`, { 'X-API-Key': apiKey });
    const baseUrl = `http://127.0.0.1:${port}`;

    const ingestPayload = {
      events: [
        {
          ts: new Date(Date.now() - 86400000).toISOString(),
          source: 'contract-test',
          task_id: taskId,
          agent: 'malik',
          model: 'sonnet',
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          cost_usd: 0.003,
          event_uid: 'evt-linked-1',
          metadata_json: { kind: 'linked' },
        },
        {
          ts: new Date(Date.now() - 86400000).toISOString(),
          source: 'contract-test',
          task_id: null,
          agent: 'unknown',
          model: 'sonnet',
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
          cost_usd: 0.0006,
          event_uid: 'evt-unlinked-1',
          metadata_json: { kind: 'unlinked' },
        },
      ],
    };

    const { res: ingestRes, data: ingestData } = await api(baseUrl, apiKey, '/api/reports/tokens/events', 'POST', ingestPayload);
    assert.equal(ingestRes.status, 200);
    assert.equal(ingestData.inserted, 2);

    const { res: dedupeRes, data: dedupeData } = await api(baseUrl, apiKey, '/api/reports/tokens/events', 'POST', ingestPayload);
    assert.equal(dedupeRes.status, 200);
    assert.equal(dedupeData.inserted, 0);
    assert.equal(dedupeData.deduped, 2);

    const { res: r1, data: d1 } = await api(baseUrl, apiKey, '/api/reports/tokens?window=30&include_unlinked=true');
    assert.equal(r1.status, 200);
    assert.equal(d1.ok, true);
    assert.equal(d1.totals.total_tokens, 240);
    assert.equal(d1.totals.unlinked_events, 1);
    assert.equal(d1.totals.linked_events, 2);
    assert.ok(typeof d1.filters.start === 'string' && d1.filters.start.length > 0);
    assert.ok(typeof d1.filters.end === 'string' && d1.filters.end.length > 0);

    const { res: r2, data: d2 } = await api(baseUrl, apiKey, '/api/reports/tokens?window=30&include_unlinked=false');
    assert.equal(r2.status, 200);
    assert.equal(d2.totals.total_tokens, 210);
    assert.equal(d2.totals.unlinked_events, 0);
    assert.ok(Array.isArray(d2.by_agent));
    assert.ok(Array.isArray(d2.by_task));
    assert.ok(Array.isArray(d2.by_model));
    assert.ok(Array.isArray(d2.trend));
    const deletedTaskRow = d2.by_task.find((row) => row.task_display_id === 'deleted-task');
    assert.ok(deletedTaskRow, 'expected deleted-task fallback row in by_task');
    assert.equal(deletedTaskRow.task_title, 'Deleted task');

    const start = new Date(Date.now() - (2 * 86400000)).toISOString();
    const end = new Date(Date.now() - (12 * 60 * 60 * 1000)).toISOString();
    const { res: r3, data: d3 } = await api(
      baseUrl,
      apiKey,
      `/api/reports/tokens?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&include_unlinked=true`
    );
    assert.equal(r3.status, 200);
    assert.equal(d3.window, 'custom');
    assert.equal(d3.totals.total_tokens, 240);

    const { res: r4, data: d4 } = await api(baseUrl, apiKey, '/api/reports/tokens?window=14');
    assert.equal(r4.status, 400);
    assert.equal(d4.ok, false);

    const emptyStart = new Date(Date.now() - (365 * 86400000)).toISOString();
    const emptyEnd = new Date(Date.now() - (300 * 86400000)).toISOString();
    const { res: r5, data: d5 } = await api(
      baseUrl,
      apiKey,
      `/api/reports/tokens?start=${encodeURIComponent(emptyStart)}&end=${encodeURIComponent(emptyEnd)}&include_unlinked=true`
    );
    assert.equal(r5.status, 200);
    assert.equal(d5.ok, true);
    assert.equal(d5.window, 'custom');
    assert.equal(d5.totals.event_count, 0);
    assert.equal(d5.totals.total_tokens, 0);
    assert.equal(d5.totals.cost_usd, 0);
    assert.equal(d5.by_agent.length, 0);
    assert.equal(d5.by_task.length, 0);
    assert.equal(d5.by_model.length, 0);
    assert.equal(d5.trend.length, 0);

    const { res: r6, data: d6 } = await api(baseUrl, apiKey, '/api/reports/tokens?start=not-a-date');
    assert.equal(r6.status, 400);
    assert.equal(d6.ok, false);

    const invalidStart = new Date(Date.now() - (6 * 60 * 60 * 1000)).toISOString();
    const invalidEnd = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
    const { res: r7, data: d7 } = await api(
      baseUrl,
      apiKey,
      `/api/reports/tokens?start=${encodeURIComponent(invalidStart)}&end=${encodeURIComponent(invalidEnd)}`
    );
    assert.equal(r7.status, 400);
    assert.equal(d7.ok, false);

    console.log('✅ reports contract tests passed');
  } finally {
    server.kill('SIGTERM');
    if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { force: true });
  }
}

main().catch((err) => {
  console.error('❌ reports contract tests failed');
  console.error(err.stack || err.message || err);
  process.exit(1);
});
