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

// POST /api/tasks
router.post('/', async (req, res) => {
  const { title, description = '', status = 'new', owner = 'matt',
          priority = 'medium', github_url = '', tags = '',
          estimated_token_effort = 'unknown' } = req.body;

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

    const id = db.insert(
      `INSERT INTO tasks (title, description, status, owner, priority, github_url, tags, estimated_token_effort, display_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, status, owner, priority, github_url, tags, estimated_token_effort, displayId]
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

  const setClause = updates.map(k => `${k} = ?`).join(', ');
  const values = [...updates.map(k => req.body[k]), req.params.id];

  try {
    await db.getDb();
    const existing = db.get('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Not found' });

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
