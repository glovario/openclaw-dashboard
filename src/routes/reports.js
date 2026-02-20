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

function clampInt(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function clampFloat(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

router.post('/tokens/events', async (req, res) => {
  const payload = req.body;
  const events = Array.isArray(payload?.events) ? payload.events : [payload];

  if (!events.length || events.some((event) => !event || typeof event !== 'object')) {
    return res.status(400).json({ ok: false, error: 'Body must be an event object or { events: [...] }' });
  }

  try {
    await db.getDb();

    let inserted = 0;
    let deduped = 0;
    const rejected = [];

    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      const source = event.source || 'unknown';
      const taskId = event.task_id == null ? null : Number.parseInt(event.task_id, 10);

      if (taskId != null && Number.isNaN(taskId)) {
        rejected.push({ index: i, reason: 'task_id must be integer or null' });
        continue;
      }

      if (taskId != null) {
        const task = db.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
        if (!task) {
          rejected.push({ index: i, reason: `task_id ${taskId} does not exist` });
          continue;
        }
      }

      const promptTokens = clampInt(event.prompt_tokens);
      const completionTokens = clampInt(event.completion_tokens);
      const totalTokens = event.total_tokens == null
        ? promptTokens + completionTokens
        : clampInt(event.total_tokens);
      const costUsd = clampFloat(event.cost_usd);

      try {
        db.insert(
          `INSERT INTO token_usage_events
            (ts, source, task_id, agent, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, event_uid, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.ts || new Date().toISOString(),
            source,
            taskId,
            event.agent || null,
            event.model || null,
            promptTokens,
            completionTokens,
            totalTokens,
            costUsd,
            event.event_uid || null,
            event.metadata_json ? JSON.stringify(event.metadata_json) : null,
          ]
        );
        inserted += 1;
      } catch (err) {
        if (String(err.message || err).includes('UNIQUE constraint failed: token_usage_events.event_uid')) {
          deduped += 1;
          continue;
        }
        throw err;
      }
    }

    const status = rejected.length ? 207 : 200;
    return res.status(status).json({ ok: true, inserted, deduped, rejected });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/tokens', async (req, res) => {
  const { window = '30', start, end, include_unlinked = 'true' } = req.query;
  const includeUnlinked = String(include_unlinked).toLowerCase() !== 'false';

  const params = [];
  let where = 'WHERE 1=1';
  let resolvedStart = null;
  let resolvedEnd = null;

  if (start || end) {
    const parsedStart = start ? Date.parse(start) : null;
    const parsedEnd = end ? Date.parse(end) : null;

    if (start && Number.isNaN(parsedStart)) {
      return res.status(400).json({ ok: false, error: 'Invalid start. Use ISO-8601 timestamp.' });
    }
    if (end && Number.isNaN(parsedEnd)) {
      return res.status(400).json({ ok: false, error: 'Invalid end. Use ISO-8601 timestamp.' });
    }
    if (start && end && parsedStart > parsedEnd) {
      return res.status(400).json({ ok: false, error: 'Invalid range. start must be <= end.' });
    }

    if (start) {
      where += ' AND e.ts >= ?';
      params.push(start);
      resolvedStart = start;
    }
    if (end) {
      where += ' AND e.ts <= ?';
      params.push(end);
      resolvedEnd = end;
    }
  } else {
    const days = parseWindowDays(window);
    if (!days) {
      return res.status(400).json({ ok: false, error: 'Invalid window. Use 7, 30, or 90, or pass start/end.' });
    }
    where += ` AND e.ts >= datetime('now', '-${days} days')`;
    resolvedStart = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
    resolvedEnd = new Date().toISOString();
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
              CASE
                WHEN e.task_id IS NULL THEN 'unlinked'
                WHEN t.display_id IS NULL THEN 'deleted-task'
                ELSE t.display_id
              END AS task_display_id,
              CASE
                WHEN e.task_id IS NULL THEN 'Unlinked'
                WHEN t.title IS NULL THEN 'Deleted task'
                ELSE t.title
              END AS task_title,
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
      filters: { start: resolvedStart, end: resolvedEnd, include_unlinked: includeUnlinked },
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
