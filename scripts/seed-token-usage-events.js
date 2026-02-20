#!/usr/bin/env node

/**
 * Seed minimal non-zero token usage events for OC-036 reconciliation flows.
 * Runs directly against dashboard.db via src/db helpers.
 */

const db = require('../src/db');

async function main() {
  await db.getDb();

  const task = db.get('SELECT id FROM tasks WHERE display_id = ?', ['OC-117']);
  if (!task) {
    throw new Error('Could not find task OC-117 for linked sample event');
  }

  const linkedId = db.insert(
    `INSERT INTO token_usage_events (
      ts, source, task_id, agent, model,
      prompt_tokens, completion_tokens, total_tokens, cost_usd, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      new Date().toISOString(),
      'oc-117-seed',
      task.id,
      'mason',
      'openai-codex/gpt-5.3-codex',
      1200,
      450,
      1650,
      0.033,
      JSON.stringify({ reason: 'bootstrap-linked-sample', created_by: 'execution-first-worker-runner' }),
    ]
  );

  const unlinkedId = db.insert(
    `INSERT INTO token_usage_events (
      ts, source, task_id, agent, model,
      prompt_tokens, completion_tokens, total_tokens, cost_usd, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      new Date().toISOString(),
      'oc-117-seed',
      null,
      'norman',
      'anthropic/claude-sonnet-4-5',
      600,
      300,
      900,
      0.021,
      JSON.stringify({ reason: 'bootstrap-unlinked-sample', created_by: 'execution-first-worker-runner' }),
    ]
  );

  console.log('Seeded events:');
  console.log(`- linked event id: ${linkedId}`);
  console.log(`- unlinked event id: ${unlinkedId}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
