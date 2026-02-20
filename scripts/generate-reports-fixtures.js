#!/usr/bin/env node
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const tmpDir = path.join(repoRoot, '.tmp');
const dbPath = path.join(tmpDir, `reports-fixtures-${Date.now()}.db`);
const fixturesDir = path.join(repoRoot, 'docs', 'token-reporting', 'fixtures');

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
  if (!res.ok) throw new Error(`API ${endpoint} returned ${res.status}`);
  return res.json();
}

async function main() {
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(fixturesDir, { recursive: true });

  process.env.DB_PATH = dbPath;
  const db = require(path.join(repoRoot, 'src/db'));
  await db.getDb();

  db.insert(
    `INSERT INTO tasks (title, description, status, owner, priority, estimated_token_effort, display_id, created_by)
     VALUES ('Fixture task A', 'seed for reports fixtures', 'in-progress', 'mason', 'medium', 'small', 'OC-990', 'fixture-generator')`
  );
  db.insert(
    `INSERT INTO tasks (title, description, status, owner, priority, estimated_token_effort, display_id, created_by)
     VALUES ('Fixture task B', 'seed for reports fixtures', 'in-progress', 'juno', 'medium', 'small', 'OC-991', 'fixture-generator')`
  );
  const taskA = db.get(`SELECT id FROM tasks WHERE display_id = 'OC-990'`).id;
  const taskB = db.get(`SELECT id FROM tasks WHERE display_id = 'OC-991'`).id;

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const events = [
    {
      ts: new Date(now - oneDay).toISOString(),
      source: 'fixture-generator',
      task_id: taskA,
      agent: 'mason',
      model: 'sonnet',
      prompt_tokens: 300,
      completion_tokens: 120,
      total_tokens: 420,
      cost_usd: 0.0084,
      event_uid: 'fixture-linked-1',
      metadata_json: { note: 'linked task A' },
    },
    {
      ts: new Date(now - oneDay).toISOString(),
      source: 'fixture-generator',
      task_id: taskB,
      agent: 'juno',
      model: 'sonnet',
      prompt_tokens: 150,
      completion_tokens: 60,
      total_tokens: 210,
      cost_usd: 0.0042,
      event_uid: 'fixture-linked-2',
      metadata_json: { note: 'linked task B' },
    },
    {
      ts: new Date(now - oneDay).toISOString(),
      source: 'fixture-generator',
      task_id: null,
      agent: 'unknown',
      model: 'sonnet',
      prompt_tokens: 50,
      completion_tokens: 20,
      total_tokens: 70,
      cost_usd: 0.0014,
      event_uid: 'fixture-unlinked-1',
      metadata_json: { note: 'unlinked spend sample' },
    },
  ];

  const port = 3521;
  const apiKey = 'test-key-reports-fixtures';
  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(port), DASHBOARD_API_KEY: apiKey, DB_PATH: dbPath },
    stdio: 'pipe',
  });

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(baseUrl, { 'X-API-Key': apiKey });

    await api(baseUrl, apiKey, '/api/reports/tokens/events', 'POST', { events });

    const populated = await api(baseUrl, apiKey, '/api/reports/tokens?window=30&include_unlinked=true');
    const linkedOnly = await api(baseUrl, apiKey, '/api/reports/tokens?window=30&include_unlinked=false');

    const emptyStart = new Date(now - (365 * oneDay)).toISOString();
    const emptyEnd = new Date(now - (300 * oneDay)).toISOString();
    const empty = await api(
      baseUrl,
      apiKey,
      `/api/reports/tokens?start=${encodeURIComponent(emptyStart)}&end=${encodeURIComponent(emptyEnd)}&include_unlinked=true`
    );

    fs.writeFileSync(path.join(fixturesDir, 'reports-populated-include-unlinked.json'), `${JSON.stringify(populated, null, 2)}\n`);
    fs.writeFileSync(path.join(fixturesDir, 'reports-populated-linked-only.json'), `${JSON.stringify(linkedOnly, null, 2)}\n`);
    fs.writeFileSync(path.join(fixturesDir, 'reports-empty-window.json'), `${JSON.stringify(empty, null, 2)}\n`);

    console.log('✅ generated report fixtures in docs/token-reporting/fixtures');
  } finally {
    server.kill('SIGTERM');
    if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { force: true });
  }
}

main().catch((err) => {
  console.error('❌ failed generating report fixtures');
  console.error(err.stack || err.message || err);
  process.exit(1);
});
