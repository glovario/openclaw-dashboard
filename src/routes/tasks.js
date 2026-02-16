const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/tasks — list all, with optional filters + pagination (OC-037)
router.get('/', async (req, res) => {
  const { status, owner, priority, search, estimated_token_effort } = req.query;
  const limit  = Math.max(1, Math.min(500, parseInt(req.query.limit  || '50', 10)));
  const offset = Math.max(0, parseInt(req.query.offset || '0', 10));

  let whereSql = 'WHERE 1=1';
  const params = [];

  if (status)   { whereSql += ' AND status = ?';   params.push(status); }
  if (owner)    { whereSql += ' AND owner = ?';    params.push(owner); }
  if (priority) { whereSql += ' AND priority = ?'; params.push(priority); }
  if (estimated_token_effort) { whereSql += ' AND estimated_token_effort = ?'; params.push(estimated_token_effort); }
  if (search)   {
    whereSql += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const orderSql = ` ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, updated_at DESC`;

  try {
    await db.getDb();
    const countRow = db.get(`SELECT COUNT(*) as total FROM tasks ${whereSql}`, params);
    const total = countRow ? countRow.total : 0;

    const tasks = db.all(
      `SELECT * FROM tasks ${whereSql}${orderSql} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // OC-033: attach blocked flag
    const blockedIds = new Set();
    {
      const blockedRows = db.all(`
        SELECT DISTINCT td.task_id
        FROM task_dependencies td
        JOIN tasks bt ON bt.id = td.blocked_by_task_id
        WHERE bt.status != 'done'
      `);
      blockedRows.forEach(r => blockedIds.add(r.task_id));
    }

    const tasksWithMeta = tasks.map(t => ({
      ...t,
      is_blocked: blockedIds.has(t.id) ? 1 : 0,
    }));

    res.json({ ok: true, tasks: tasksWithMeta, total, limit, offset });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    await db.getDb();
    const task = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ ok: false, error: 'Not found' });

    const blockedRow = db.get(`
      SELECT COUNT(*) as cnt FROM task_dependencies td
      JOIN tasks bt ON bt.id = td.blocked_by_task_id
      WHERE td.task_id = ? AND bt.status != 'done'
    `, [req.params.id]);
    task.is_blocked = blockedRow && blockedRow.cnt > 0 ? 1 : 0;

    res.json({ ok: true, task });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  const { title, description = '', status = 'new', owner = 'matt',
          priority = 'medium', github_url = '', tags = '',
          estimated_token_effort = 'unknown',
          created_by = 'matt' } = req.body;

  if (!title) return res.status(400).json({ ok: false, error: 'title is required' });

  const validStatus   = ['new','backlog','in-progress','on-hold','for-approval','review','done'];
  const validOwner    = ['norman','ada','mason','atlas','bard','matt','team'];
  const validPriority = ['low','medium','high'];
  const validEffort   = ['unknown','small','medium','large'];

  if (!validStatus.includes(status))               return res.status(400).json({ ok: false, error: 'Invalid status' });
  if (!validOwner.includes(owner))                 return res.status(400).json({ ok: false, error: 'Invalid owner' });
  if (!validPriority.includes(priority))           return res.status(400).json({ ok: false, error: 'Invalid priority' });
  if (!validEffort.includes(estimated_token_effort)) return res.status(400).json({ ok: false, error: 'Invalid estimated_token_effort' });

  try {
    await db.getDb();
    const maxRow = db.get(`SELECT display_id FROM tasks WHERE display_id IS NOT NULL ORDER BY CAST(SUBSTR(display_id,4) AS INTEGER) DESC LIMIT 1`);
    let nextSeq = 1;
    if (maxRow && maxRow.display_id) {
      const m = maxRow.display_id.match(/^OC-(\d+)$/);
      if (m) nextSeq = parseInt(m[1], 10) + 1;
    }
    const displayId = `OC-${String(nextSeq).padStart(3, '0')}`;

    const id = db.insert(
      `INSERT INTO tasks (title, description, status, owner, priority, github_url, tags, estimated_token_effort, display_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, status, owner, priority, github_url, tags, estimated_token_effort, displayId, created_by]
    );

    // OC-032: record creation event
    db.run(
      `INSERT INTO task_history (task_id, changed_by, field_name, old_value, new_value, changed_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [id, created_by, '_created', null, title]
    );

    const task = db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    res.status(201).json({ ok: true, task });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res) => {
  const allowed = ['title','description','status','owner','priority','github_url','tags','estimated_token_effort'];
  const updates = Object.keys(req.body).filter(k => allowed.includes(k));

  if (!updates.length) return res.status(400).json({ ok: false, error: 'No valid fields' });

  const validStatus   = ['new','backlog','in-progress','on-hold','for-approval','review','done'];
  const validOwner    = ['norman','ada','mason','atlas','bard','matt','team'];
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

  const setClause = updates.map(k => `${k} = ?`).join(', ');
  const values = [...updates.map(k => req.body[k]), req.params.id];

  try {
    await db.getDb();
    const existing = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Not found' });

    // OC-032: record history for each changed field
    const changedBy = req.body.changed_by || 'system';
    for (const field of updates) {
      const oldVal = existing[field] != null ? String(existing[field]) : null;
      const newVal = req.body[field] != null ? String(req.body[field]) : null;
      if (oldVal !== newVal) {
        db.run(
          `INSERT INTO task_history (task_id, changed_by, field_name, old_value, new_value, changed_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          [req.params.id, changedBy, field, oldVal, newVal]
        );
      }
    }

    db.run(
      `UPDATE tasks SET ${setClause}, updated_at = datetime('now') WHERE id = ?`,
      values
    );
    const task = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);

    const blockedRow = db.get(`
      SELECT COUNT(*) as cnt FROM task_dependencies td
      JOIN tasks bt ON bt.id = td.blocked_by_task_id
      WHERE td.task_id = ? AND bt.status != 'done'
    `, [req.params.id]);
    task.is_blocked = blockedRow && blockedRow.cnt > 0 ? 1 : 0;

    res.json({ ok: true, task });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// DELETE /api/tasks/:id
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

// OC-032: GET /api/tasks/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    await db.getDb();
    const task = db.get('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ ok: false, error: 'Not found' });
    const history = db.all(
      `SELECT * FROM task_history WHERE task_id = ? ORDER BY changed_at ASC`,
      [req.params.id]
    );
    res.json({ ok: true, history });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// OC-033: GET /api/tasks/:id/dependencies
router.get('/:id/dependencies', async (req, res) => {
  try {
    await db.getDb();
    const task = db.get('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ ok: false, error: 'Not found' });

    const blocked_by = db.all(`
      SELECT t.*, td.id as dep_id FROM tasks t
      JOIN task_dependencies td ON td.blocked_by_task_id = t.id
      WHERE td.task_id = ?
    `, [req.params.id]);

    const blocking = db.all(`
      SELECT t.*, td.id as dep_id FROM tasks t
      JOIN task_dependencies td ON td.task_id = t.id
      WHERE td.blocked_by_task_id = ?
    `, [req.params.id]);

    res.json({ ok: true, blocked_by, blocking });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// OC-033: POST /api/tasks/:id/dependencies
router.post('/:id/dependencies', async (req, res) => {
  const { blocked_by_task_id } = req.body;
  if (!blocked_by_task_id) return res.status(400).json({ ok: false, error: 'blocked_by_task_id is required' });

  const taskId = parseInt(req.params.id, 10);
  const blockerId = parseInt(blocked_by_task_id, 10);

  if (taskId === blockerId) return res.status(400).json({ ok: false, error: 'Task cannot block itself' });

  try {
    await db.getDb();
    const task    = db.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
    const blocker = db.get('SELECT id FROM tasks WHERE id = ?', [blockerId]);
    if (!task)    return res.status(404).json({ ok: false, error: 'Task not found' });
    if (!blocker) return res.status(404).json({ ok: false, error: 'Blocking task not found' });

    if (wouldCreateCycle(taskId, blockerId)) {
      return res.status(400).json({ ok: false, error: 'Circular dependency detected' });
    }

    const id = db.insert(
      `INSERT OR IGNORE INTO task_dependencies (task_id, blocked_by_task_id) VALUES (?, ?)`,
      [taskId, blockerId]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// OC-033: DELETE /api/tasks/:id/dependencies/:dep_id
router.delete('/:id/dependencies/:dep_id', async (req, res) => {
  try {
    await db.getDb();
    const dep = db.get(
      `SELECT id FROM task_dependencies WHERE id = ? AND task_id = ?`,
      [req.params.dep_id, req.params.id]
    );
    if (!dep) return res.status(404).json({ ok: false, error: 'Dependency not found' });
    db.run(`DELETE FROM task_dependencies WHERE id = ?`, [req.params.dep_id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// BFS cycle check
function wouldCreateCycle(taskId, blockerId) {
  const visited = new Set();
  const queue = [blockerId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const parents = db.all(
      `SELECT blocked_by_task_id FROM task_dependencies WHERE task_id = ?`,
      [current]
    );
    parents.forEach(p => queue.push(p.blocked_by_task_id));
  }
  return false;
}

module.exports = router;
