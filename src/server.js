const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3420;

// Legacy API key support (for direct API access, e.g. from agents/CLI)
let apiKey = process.env.DASHBOARD_API_KEY;
if (!apiKey) {
  apiKey = crypto.randomBytes(32).toString('hex');
  console.log('⚠️  DASHBOARD_API_KEY not set. Generated a temporary key for this session:');
  console.log(`   DASHBOARD_API_KEY=${apiKey}`);
  console.log('   Set this env var to keep it stable across restarts.');
}

// Session auth (browser UI)
const { router: authRouter, sessions } = require('./routes/auth');
const authMode = !!process.env.DASHBOARD_PASSWORD;
if (authMode) {
  console.log('🔒 Password auth enabled (DASHBOARD_PASSWORD is set)');
} else {
  console.log('⚠️  No DASHBOARD_PASSWORD set — auth in dev mode (any password accepted)');
}

// Middleware
app.use(express.json());

// Public routes — no auth required
app.use('/api/auth', authRouter);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), service: 'openclaw-dashboard' });
});

// Serve static assets without auth
app.use('/assets', express.static(path.join(__dirname, '..', 'public', 'assets')));
app.use('/favicon.ico', express.static(path.join(__dirname, '..', 'public', 'favicon.ico')));
app.use('/logo.svg', express.static(path.join(__dirname, '..', 'public', 'logo.svg')));

// Serve index.html (no key injection)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// API authentication middleware for all /api/* routes (except /api/auth/*)
app.use('/api', (req, res, next) => {
  // Allow legacy X-API-Key header (for agents/CLI)
  const legacyKey = req.headers['x-api-key'];
  if (legacyKey) {
    const expected = Buffer.from(apiKey);
    const given = Buffer.from(legacyKey);
    if (expected.length === given.length && crypto.timingSafeEqual(expected, given)) {
      return next();
    }
    return res.status(403).json({ ok: false, error: 'Invalid API key' });
  }

  // Bearer token from session
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }

  const expiry = sessions.get(token);
  if (!expiry || Date.now() > expiry) {
    sessions.delete(token);
    return res.status(401).json({ ok: false, error: 'Session expired or invalid' });
  }

  next();
});

// Routes
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/tasks/:id/comments', require('./routes/comments'));
app.use('/api/system', require('./routes/system'));

// Catch-all → SPA index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OpenClaw Dashboard running at http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/tasks`);
});
