const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

/**
 * GET /api/tasks/:id/comments
 * Lists comments for a task in creation order.
 */
router.get('/', async (req, res) => {
  try {
    await db.getDb();
    const task = db.get('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' });
    const comments = db.all(
      'SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({ ok: true, comments });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/tasks/:id/comments
 * Adds a comment to the task. Requires author + body.
 */
router.post('/', async (req, res) => {
  const { author, body } = req.body;
  if (!author) return res.status(400).json({ ok: false, error: 'author is required' });
  if (!body)   return res.status(400).json({ ok: false, error: 'body is required' });
  try {
    await db.getDb();
    const task = db.get('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' });
    const id = db.insert(
      'INSERT INTO comments (task_id, author, body) VALUES (?, ?, ?)',
      [req.params.id, author, body]
    );
    const comment = db.get('SELECT * FROM comments WHERE id = ?', [id]);
    res.status(201).json({ ok: true, comment });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
