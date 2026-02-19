const express = require('express');
const router = express.Router();
const db = require('../db');

const VALID_OWNERS = ['norman','ada','mason','atlas','bard','quinn','juno','malik','priya','elias','rowan','asha','soren','elena','nia','theo','matt','team'];
const ENFORCED_BINDING_OWNERS = new Set(VALID_OWNERS.filter(o => !['matt', 'team'].includes(o)));
const ASSIGNEE_PRESENCE_TTL_MINUTES = parseInt(process.env.ASSIGNEE_PRESENCE_TTL_MINUTES || '30', 10);
const TRACEABILITY_STATUSES = new Set(['review', 'for-approval', 'done']);

function hasTraceabilityUrl(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  if (!s) return false;
  return /^https?:\/\//i.test(s) || /^N\/?A$/i.test(s);
}

/**
 * GET /api/tasks
 * Returns the list of tasks with optional filters (status, owner, priority, estimated_token_effort, search).
 * Results are ordered by priority (high → low) then most recently updated.
 */
router.get('/', async (req, res) => {
  const { status, owner, priority, search, estimated_token_effort } = req.query;
  let sql = `SELECT t.*,
    COALESCE(SUM(CASE WHEN d.blocked_by IS NOT NULL AND (b.status IS NULL OR b.status != 'done') THEN 1 ELSE 0 END), 0) AS unresolved_blocker_count,
    CASE WHEN COALESCE(SUM(CASE WHEN d.blocked_by IS NOT NULL AND (b.status IS NULL OR b.status != 'done') THEN 1 ELSE 0 END), 0) > 0 THEN 1 ELSE 0 END AS is_blocked,
    ap.state AS owner_presence_state,
    ap.last_seen AS owner_last_seen,
    CASE
      WHEN ap.last_seen IS NOT NULL AND (julianday('now') - julianday(ap.last_seen)) * 24 * 60 <= ${ASSIGNEE_PRESENCE_TTL_MINUTES} THEN 1
      ELSE 0
    END AS owner_active
    FROM tasks t
    LEFT JOIN task_dependencies d ON d.task_id = t.id
    LEFT JOIN tasks b ON b.id = d.blocked_by
    LEFT JOIN agent_presence ap ON ap.owner = t.owner
    WHERE 1=1`;
  const params = [];

  if (status)   { sql += ' AND t.status = ?';   params.push(status); }
  if (owner)    { sql += ' AND t.owner = ?';    params.push(owner); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  if (estimated_token_effort) { sql += ' AND t.estimated_token_effort = ?'; params.push(estimated_token_effort); }
  if (search)   {
    sql += ' AND (t.title LIKE ? OR t.description LIKE ? OR t.tags LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  sql += " GROUP BY t.id ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, t.updated_at DESC";

  try {
    await db.getDb();
    const tasks = db.all(sql, params);
    res.json({ ok: true, tasks });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/tasks/:id
 * Returns the details for the requested task id (404 when missing).
 */
router.get('/agent-bindings/escalation-scan', async (req, res) => {
  const staleMinutes = parseInt(req.query.staleMinutes || '120', 10);
  try {
    await db.getDb();
    const stale = db.all(`
      SELECT t.id, t.display_id, t.title, t.owner, t.status, t.updated_at,
        ap.last_seen AS owner_last_seen,
        CASE
          WHEN ap.last_seen IS NOT NULL AND (julianday('now') - julianday(ap.last_seen)) * 24 * 60 <= ? THEN 1
          ELSE 0
        END AS owner_active,
        CAST((julianday('now') - julianday(t.updated_at)) * 24 * 60 AS INTEGER) AS minutes_since_task_update
      FROM tasks t
      LEFT JOIN agent_presence ap ON ap.owner = t.owner
      WHERE t.status = 'in-progress'
        AND ((julianday('now') - julianday(t.updated_at)) * 24 * 60) > ?
      ORDER BY t.updated_at ASC
    `, [ASSIGNEE_PRESENCE_TTL_MINUTES, staleMinutes]);
    res.json({ ok: true, staleMinutes, stale });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/agent-bindings', async (_req, res) => {
  try {
    await db.getDb();
    const bindings = db.all(`
      SELECT owner, session_key, state, last_seen, updated_at,
        CASE
          WHEN last_seen IS NOT NULL AND (julianday('now') - julianday(last_seen)) * 24 * 60 <= ? THEN 1
          ELSE 0
        END AS active
      FROM agent_presence
      ORDER BY owner ASC
    `, [ASSIGNEE_PRESENCE_TTL_MINUTES]);
    res.json({ ok: true, bindings, ttl_minutes: ASSIGNEE_PRESENCE_TTL_MINUTES });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/agent-bindings/heartbeat', async (req, res) => {
  const { owner, session_key = null, state = 'online' } = req.body || {};
  if (!owner) return res.status(400).json({ ok: false, error: 'owner is required' });
  if (!VALID_OWNERS.includes(owner)) return res.status(400).json({ ok: false, error: 'Invalid owner' });
  try {
    await db.getDb();
    db.run(`
      INSERT INTO agent_presence (owner, session_key, state, last_seen, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(owner) DO UPDATE SET
        session_key = excluded.session_key,
        state = excluded.state,
        last_seen = datetime('now'),
        updated_at = datetime('now')
    `, [owner, session_key, state]);
    const binding = db.get('SELECT * FROM agent_presence WHERE owner = ?', [owner]);
    res.json({ ok: true, binding });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    await db.getDb();
    const task = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, task });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/tasks/:id/history
 * Returns up to `limit` field-change entries for the task audit log (default 50).
 */
router.get('/:id/history', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  try {
    await db.getDb();
    const task = db.get('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ ok: false, error: 'Not found' });
    const history = db.all(
      `SELECT * FROM task_history WHERE task_id = ? ORDER BY changed_at DESC LIMIT ?`,
      [req.params.id, limit]
    );
    res.json({ ok: true, history });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/tasks
 * Creates a new task. Required body: title + enums (status, owner, priority, estimated_token_effort).
 * Automatically generates display_id and validates parent_id when provided.
 */
router.post('/', async (req, res) => {
  const { title, description = '', status = 'new', owner = 'matt',
          priority = 'medium', github_url = '', tags = '',
          estimated_token_effort = 'unknown', created_by = 'matt',
          parent_id = null } = req.body;
  const normalizedTags = typeof tags === 'string' ? tags : '';

  if (!title) return res.status(400).json({ ok: false, error: 'title is required' });

  const validStatus   = ['new','backlog','scope-and-design','in-progress','on-hold','for-approval','review','done'];
  const validOwner    = VALID_OWNERS;
  const validPriority = ['low','medium','high'];
  const validEffort   = ['unknown','small','medium','large'];

  if (!validStatus.includes(status))               return res.status(400).json({ ok: false, error: 'Invalid status' });
  if (!validOwner.includes(owner))                 return res.status(400).json({ ok: false, error: 'Invalid owner' });
  if (!validPriority.includes(priority))           return res.status(400).json({ ok: false, error: 'Invalid priority' });
  if (!validEffort.includes(estimated_token_effort)) return res.status(400).json({ ok: false, error: 'Invalid estimated_token_effort' });
  if (TRACEABILITY_STATUSES.has(status) && !hasTraceabilityUrl(github_url)) {
    return res.status(400).json({ ok: false, error: 'github_url is required (or N/A) when creating tasks in review/for-approval/done.' });
  }

  try {
    await db.getDb();
    // Generate next display_id
    const maxRow = db.get(`SELECT display_id FROM tasks WHERE display_id IS NOT NULL ORDER BY CAST(SUBSTR(display_id,4) AS INTEGER) DESC LIMIT 1`);
    let nextSeq = 1;
    if (maxRow && maxRow.display_id) {
      const m = maxRow.display_id.match(/^OC-(\d+)$/);
      if (m) nextSeq = parseInt(m[1], 10) + 1;
    }
    const displayId = `OC-${String(nextSeq).padStart(3, '0')}`;

    // Validate parent_id if provided
    if (parent_id !== null) {
      const parent = db.get('SELECT id FROM tasks WHERE id = ?', [parent_id]);
      if (!parent) return res.status(400).json({ ok: false, error: `parent_id ${parent_id} does not exist` });
    }

    const id = db.insert(
      `INSERT INTO tasks (title, description, status, owner, priority, github_url, tags, estimated_token_effort, display_id, created_by, parent_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, status, owner, priority, github_url, normalizedTags, estimated_token_effort, displayId, created_by, parent_id]
    );
    const task = db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    res.status(201).json({ ok: true, task });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/tasks/:id/dependencies
 * Returns tasks that the given task depends on (blocked_by relationships).
 */
router.get('/:id/dependencies', async (req, res) => {
  try {
    await db.getDb();
    const task = db.get('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ ok: false, error: 'Not found' });
    const deps = db.all(
      `SELECT t.* FROM tasks t
       JOIN task_dependencies d ON d.blocked_by = t.id
       WHERE d.task_id = ?`,
      [req.params.id]
    );
    res.json({ ok: true, dependencies: deps });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/tasks/:id/dependencies
 * Adds a blocked-by relationship (task cannot depend on itself or create immediate circular links).
 */
router.post('/:id/dependencies', async (req, res) => {
  const { blocked_by } = req.body;
  if (!blocked_by) return res.status(400).json({ ok: false, error: 'blocked_by is required' });
  const taskId = parseInt(req.params.id, 10);
  const blockerId = parseInt(blocked_by, 10);
  if (taskId === blockerId) return res.status(400).json({ ok: false, error: 'A task cannot depend on itself' });
  try {
    await db.getDb();
    if (!db.get('SELECT id FROM tasks WHERE id = ?', [taskId]))
      return res.status(404).json({ ok: false, error: 'Task not found' });
    if (!db.get('SELECT id FROM tasks WHERE id = ?', [blockerId]))
      return res.status(404).json({ ok: false, error: `Blocker task ${blockerId} not found` });
    // Basic circular dependency guard (one level)
    const reverse = db.get('SELECT id FROM task_dependencies WHERE task_id = ? AND blocked_by = ?', [blockerId, taskId]);
    if (reverse) return res.status(400).json({ ok: false, error: 'Circular dependency detected' });
    db.run('INSERT OR IGNORE INTO task_dependencies (task_id, blocked_by) VALUES (?, ?)', [taskId, blockerId]);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

/**
 * DELETE /api/tasks/:id/dependencies/:blockerId
 * Removes a blocked-by link, implicitly allowing the task to unblock.
 */
router.delete('/:id/dependencies/:blockerId', async (req, res) => {
  try {
    await db.getDb();
    db.run('DELETE FROM task_dependencies WHERE task_id = ? AND blocked_by = ?',
      [req.params.id, req.params.blockerId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * PATCH /api/tasks/:id
 * Updates editable task fields (title, status, owner, priority, github_url, tags, estimated effort, parent, created_by).
 * Rejects invalid enums and records history entries for each change.
 */
router.patch('/:id', async (req, res) => {
  const allowed = ['title','description','status','owner','priority','github_url','tags','estimated_token_effort','parent_id','created_by'];
  const updates = Object.keys(req.body).filter(k => allowed.includes(k));

  if (!updates.length) return res.status(400).json({ ok: false, error: 'No valid fields to update' });

  // Validate enum fields (OC-103)
  const validStatus   = ['new','backlog','scope-and-design','in-progress','on-hold','for-approval','review','done'];
  const validOwner    = VALID_OWNERS;
  const validPriority = ['low','medium','high'];
  const validEffort   = ['unknown','small','medium','large'];

  if (req.body.status !== undefined && !validStatus.includes(req.body.status))
    return res.status(400).json({ ok: false, error: `Invalid status. Allowed: ${validStatus.join(', ')}` });
  if (req.body.owner !== undefined && !validOwner.includes(req.body.owner))
    return res.status(400).json({ ok: false, error: `Invalid owner. Allowed: ${validOwner.join(', ')}` });
  if (req.body.priority !== undefined && !validPriority.includes(req.body.priority))
    return res.status(400).json({ ok: false, error: `Invalid priority. Allowed: ${validPriority.join(', ')}` });
  if (req.body.estimated_token_effort !== undefined && !validEffort.includes(req.body.estimated_token_effort))
    return res.status(400).json({ ok: false, error: `Invalid estimated_token_effort. Allowed: ${validEffort.join(', ')}` });

  const normalizedBody = { ...req.body };
  if (normalizedBody.tags !== undefined && typeof normalizedBody.tags !== 'string') {
    normalizedBody.tags = '';
  }

  const setClause = updates.map(k => `${k} = ?`).join(', ');
  const values = [...updates.map(k => normalizedBody[k]), req.params.id];

  try {
    await db.getDb();
    // Fetch full row for field diffing (OC-099 audit log)
    const existing = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Not found' });

    // OC-141: enforce live assignee binding before entering in-progress
    const targetStatus = normalizedBody.status !== undefined ? normalizedBody.status : existing.status;
    const targetOwner = normalizedBody.owner !== undefined ? normalizedBody.owner : existing.owner;
    const targetGithubUrl = normalizedBody.github_url !== undefined ? normalizedBody.github_url : existing.github_url;
    if (TRACEABILITY_STATUSES.has(targetStatus) && !hasTraceabilityUrl(targetGithubUrl)) {
      return res.status(409).json({
        ok: false,
        error: `Cannot move to ${targetStatus}: github_url is required (or N/A) for traceability.`
      });
    }

    if (targetStatus === 'in-progress' && ENFORCED_BINDING_OWNERS.has(targetOwner)) {
      const binding = db.get(`
        SELECT owner, last_seen,
          CASE
            WHEN last_seen IS NOT NULL AND (julianday('now') - julianday(last_seen)) * 24 * 60 <= ? THEN 1
            ELSE 0
          END AS active
        FROM agent_presence
        WHERE owner = ?
      `, [ASSIGNEE_PRESENCE_TTL_MINUTES, targetOwner]);
      if (!binding || Number(binding.active) !== 1) {
        return res.status(409).json({
          ok: false,
          error: `Cannot move to in-progress: owner '${targetOwner}' has no active live binding heartbeat (TTL ${ASSIGNEE_PRESENCE_TTL_MINUTES}m).`
        });
      }
    }

    // Record history entries for each changed field (OC-007.2)
    const author = req.headers['x-author'] || 'system';
    for (const field of updates) {
      const oldVal = existing[field] !== undefined ? String(existing[field]) : null;
      const newVal = normalizedBody[field] !== undefined ? String(normalizedBody[field]) : null;
      if (oldVal !== newVal) {
        db.run(
          `INSERT INTO task_history (task_id, field_name, old_value, new_value, author) VALUES (?, ?, ?, ?, ?)`,
          [req.params.id, field, oldVal, newVal, author]
        );
      }
    }

    db.run(
      `UPDATE tasks SET ${setClause}, updated_at = datetime('now') WHERE id = ?`,
      values
    );
    const task = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ ok: true, task });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

/**
 * DELETE /api/tasks/:id
 * Drops the task and cascades dependent data (history, comments, dependencies).
 */
router.delete('/:id', async (req, res) => {
  try {
    await db.getDb();
    const existing = db.get('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Not found' });
    db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
