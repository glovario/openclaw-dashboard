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

async function api(baseUrl, key, endpoint) {
  const res = await fetch(`${baseUrl}${endpoint}`, { headers: { 'X-API-Key': key } });
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
    `INSERT INTO token_usage_events
      (ts, source, task_id, agent, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, metadata_json)
      VALUES (datetime('now', '-1 day'), 'contract-test', ?, 'malik', 'sonnet', 100, 50, 150, 0.003, '{"kind":"linked"}')`,
    [taskId]
  );
  db.insert(
    `INSERT INTO token_usage_events
      (ts, source, task_id, agent, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, metadata_json)
      VALUES (datetime('now', '-1 day'), 'contract-test', NULL, 'unknown', 'sonnet', 20, 10, 30, 0.0006, '{"kind":"unlinked"}')`
  );

  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: repoRoot,
    env,
    stdio: 'pipe',
  });

  let stderr = '';
  server.stderr.on('data', (d) => { stderr += d.toString(); });

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(baseUrl, { 'X-API-Key': apiKey });

    const { res: r1, data: d1 } = await api(baseUrl, apiKey, '/api/reports/tokens?window=30&include_unlinked=true');
    assert.equal(r1.status, 200);
    assert.equal(d1.ok, true);
    assert.equal(d1.totals.total_tokens, 180);
    assert.equal(d1.totals.unlinked_events, 1);
    assert.equal(d1.totals.linked_events, 1);

    const { res: r2, data: d2 } = await api(baseUrl, apiKey, '/api/reports/tokens?window=30&include_unlinked=false');
    assert.equal(r2.status, 200);
    assert.equal(d2.totals.total_tokens, 150);
    assert.equal(d2.totals.unlinked_events, 0);
    assert.ok(Array.isArray(d2.by_agent));
    assert.ok(Array.isArray(d2.by_task));
    assert.ok(Array.isArray(d2.by_model));
    assert.ok(Array.isArray(d2.trend));

    const { res: r3, data: d3 } = await api(baseUrl, apiKey, '/api/reports/tokens?window=14');
    assert.equal(r3.status, 400);
    assert.equal(d3.ok, false);

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
