const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// In-memory session store: token -> expiry
const sessions = new Map();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of sessions.entries()) {
    if (now > expiry) sessions.delete(token);
  }
}, 60 * 60 * 1000); // every hour

// POST /api/auth/session — exchange password for session token
router.post('/session', (req, res) => {
  const password = process.env.DASHBOARD_PASSWORD;

  // No password set = dev mode, issue a permanent-ish token
  if (!password) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + SESSION_TTL_MS);
    return res.json({ ok: true, token });
  }

  const { password: provided } = req.body || {};
  if (!provided) {
    return res.status(400).json({ ok: false, error: 'Password required' });
  }

  // Constant-time compare
  const expected = Buffer.from(password);
  const given = Buffer.from(provided);
  const valid =
    expected.length === given.length &&
    crypto.timingSafeEqual(expected, given);

  if (!valid) {
    return res.status(403).json({ ok: false, error: 'Invalid password' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  res.json({ ok: true, token });
});

// DELETE /api/auth/session — logout
router.delete('/session', (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

module.exports = { router, sessions };
