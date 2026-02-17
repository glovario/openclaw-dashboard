const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/tasks — list all, with optional filters
router.get('/', async (req, res) => {
  const { status, owner, priority, search, estimated_token_effort } = req.query;
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (status)   { sql += ' AND status = ?';   params.push(status); }
  if (owner)    { sql += ' AND owner = ?';    params.push(owner); }
  if (priority) { sql += ' AND priority = ?'; params.push(priority); }
  if (estimated_token_effort) { sql += ' AND estimated_token_effort = ?'; params.push(estimated_token_effort); }
  if (search)   {
    sql += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  sql += ' ORDER BY CASE priority WHEN \'high\' THEN 0 WHEN \'medium\' THEN 1 ELSE 2 END, updated_at DESC';

  try {
    await db.getDb();
    const tasks = db.all(sql, params);
    res.json({ ok: true, tasks });
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
    res.json({ ok: true, task });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/tasks/:id/history — OC-099: return audit log for a task
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

// POST /api/tasks
router.post('/', async (req, res) => {
  const { title, description = '', status = 'new', owner = 'matt',
          priority = 'medium', github_url = '', tags = '',
          estimated_token_effort = 'unknown', created_by = 'matt',
          parent_id = null } = req.body;

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
      [title, description, status, owner, priority, github_url, tags, estimated_token_effort, displayId, created_by, parent_id]
    );
    const task = db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    res.status(201).json({ ok: true, task });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// GET /api/tasks/:id/dependencies — OC-105: list blocked-by relationships
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

// POST /api/tasks/:id/dependencies — add a blocked-by relationship
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

// DELETE /api/tasks/:id/dependencies/:blockerId — remove a blocked-by relationship
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

// PATCH /api/tasks/:id
// Allowed fields (OC-103): all editable task fields including created_by (OC-107)
router.patch('/:id', async (req, res) => {
  const allowed = ['title','description','status','owner','priority','github_url','tags','estimated_token_effort','parent_id','created_by'];
  const updates = Object.keys(req.body).filter(k => allowed.includes(k));

  if (!updates.length) return res.status(400).json({ ok: false, error: 'No valid fields to update' });

  // Validate enum fields (OC-103)
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
    // Fetch full row for field diffing (OC-099 audit log)
    const existing = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Not found' });

    // Record history entries for each changed field (OC-099)
    const author = req.body._author || 'system';
    for (const field of updates) {
      const oldVal = existing[field] !== undefined ? String(existing[field]) : null;
      const newVal = req.body[field] !== undefined ? String(req.body[field]) : null;
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

module.exports = router;
