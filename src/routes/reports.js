const express = require('express');
const router = express.Router();
const db = require('../db');

function parseWindowDays(windowValue) {
  if (!windowValue) return 30;
  if (windowValue === '7' || windowValue === '30' || windowValue === '90') return parseInt(windowValue, 10);
  const n = parseInt(windowValue, 10);
  if ([7, 30, 90].includes(n)) return n;
  return null;
}

function nonNegativeInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

function nonNegativeFloat(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

router.post('/tokens/events', async (req, res) => {
  const {
    ts,
    source = 'manual',
    task_id = null,
    task_display_id,
    agent = null,
    model = null,
    prompt_tokens = 0,
    completion_tokens = 0,
    total_tokens,
    cost_usd = 0,
    metadata = null,
  } = req.body || {};

  try {
    await db.getDb();

    let resolvedTaskId = task_id;
    if ((resolvedTaskId === null || resolvedTaskId === undefined || resolvedTaskId === '') && task_display_id) {
      const task = db.get('SELECT id FROM tasks WHERE display_id = ?', [String(task_display_id)]);
      if (!task) {
        return res.status(400).json({ ok: false, error: `Unknown task_display_id: ${task_display_id}` });
      }
      resolvedTaskId = task.id;
    }

    if (resolvedTaskId !== null && resolvedTaskId !== undefined && resolvedTaskId !== '') {
      const task = db.get('SELECT id FROM tasks WHERE id = ?', [Number(resolvedTaskId)]);
      if (!task) {
        return res.status(400).json({ ok: false, error: `Unknown task_id: ${resolvedTaskId}` });
      }
      resolvedTaskId = Number(resolvedTaskId);
    } else {
      resolvedTaskId = null;
    }

    const prompt = nonNegativeInt(prompt_tokens, 0);
    const completion = nonNegativeInt(completion_tokens, 0);
    const total = total_tokens === undefined || total_tokens === null
      ? prompt + completion
      : nonNegativeInt(total_tokens, prompt + completion);

    const eventId = db.insert(
      `INSERT INTO token_usage_events (
        ts, source, task_id, agent, model,
        prompt_tokens, completion_tokens, total_tokens, cost_usd, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ts || new Date().toISOString(),
        String(source || 'manual'),
        resolvedTaskId,
        agent ? String(agent) : null,
        model ? String(model) : null,
        prompt,
        completion,
        total,
        nonNegativeFloat(cost_usd, 0),
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    const event = db.get('SELECT * FROM token_usage_events WHERE id = ?', [eventId]);
    res.status(201).json({ ok: true, event });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/tokens', async (req, res) => {
  const { window = '30', start, end, include_unlinked = 'true' } = req.query;
  const includeUnlinked = String(include_unlinked).toLowerCase() !== 'false';

  const params = [];
  let where = 'WHERE 1=1';

  if (start || end) {
    if (start) {
      where += ' AND e.ts >= ?';
      params.push(start);
    }
    if (end) {
      where += ' AND e.ts <= ?';
      params.push(end);
    }
  } else {
    const days = parseWindowDays(window);
    if (!days) {
      return res.status(400).json({ ok: false, error: 'Invalid window. Use 7, 30, or 90, or pass start/end.' });
    }
    where += ` AND e.ts >= datetime('now', '-${days} days')`;
  }

  if (!includeUnlinked) where += ' AND e.task_id IS NOT NULL';

  try {
    await db.getDb();

    const totals = db.get(
      `SELECT
        COALESCE(SUM(e.prompt_tokens),0) AS prompt_tokens,
        COALESCE(SUM(e.completion_tokens),0) AS completion_tokens,
        COALESCE(SUM(e.total_tokens),0) AS total_tokens,
        COALESCE(SUM(e.cost_usd),0) AS cost_usd,
        COALESCE(SUM(CASE WHEN e.task_id IS NULL THEN 1 ELSE 0 END),0) AS unlinked_events,
        COALESCE(SUM(CASE WHEN e.task_id IS NOT NULL THEN 1 ELSE 0 END),0) AS linked_events,
        COUNT(*) AS event_count
      FROM token_usage_events e
      ${where}`,
      params
    ) || {};

    const byAgent = db.all(
      `SELECT COALESCE(e.agent, 'unknown') AS agent,
              COALESCE(SUM(e.total_tokens),0) AS total_tokens,
              COALESCE(SUM(e.cost_usd),0) AS cost_usd,
              COUNT(*) AS event_count
       FROM token_usage_events e
       ${where}
       GROUP BY COALESCE(e.agent, 'unknown')
       ORDER BY cost_usd DESC, total_tokens DESC
       LIMIT 20`,
      params
    );

    const byTask = db.all(
      `SELECT e.task_id,
              COALESCE(t.display_id, 'unlinked') AS task_display_id,
              COALESCE(t.title, 'Unlinked') AS task_title,
              COALESCE(SUM(e.total_tokens),0) AS total_tokens,
              COALESCE(SUM(e.cost_usd),0) AS cost_usd,
              COUNT(*) AS event_count
       FROM token_usage_events e
       LEFT JOIN tasks t ON t.id = e.task_id
       ${where}
       GROUP BY e.task_id, t.display_id, t.title
       ORDER BY cost_usd DESC, total_tokens DESC
       LIMIT 20`,
      params
    );

    const byModel = db.all(
      `SELECT COALESCE(e.model, 'unknown') AS model,
              COALESCE(SUM(e.total_tokens),0) AS total_tokens,
              COALESCE(SUM(e.cost_usd),0) AS cost_usd,
              COUNT(*) AS event_count
       FROM token_usage_events e
       ${where}
       GROUP BY COALESCE(e.model, 'unknown')
       ORDER BY cost_usd DESC, total_tokens DESC
       LIMIT 20`,
      params
    );

    const trend = db.all(
      `SELECT substr(e.ts, 1, 10) AS day,
              COALESCE(SUM(e.total_tokens),0) AS total_tokens,
              COALESCE(SUM(e.cost_usd),0) AS cost_usd,
              COUNT(*) AS event_count
       FROM token_usage_events e
       ${where}
       GROUP BY substr(e.ts, 1, 10)
       ORDER BY day ASC`,
      params
    );

    res.json({
      ok: true,
      window: start || end ? 'custom' : window,
      filters: { start: start || null, end: end || null, include_unlinked: includeUnlinked },
      totals,
      by_agent: byAgent,
      by_task: byTask,
      by_model: byModel,
      trend,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
