const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3420;

// --- API Key Auth ---
let apiKey = process.env.DASHBOARD_API_KEY;
if (!apiKey) {
  apiKey = crypto.randomBytes(32).toString('hex');
  console.log('⚠️  DASHBOARD_API_KEY not set. Generated a temporary key for this session:');
  console.log(`   DASHBOARD_API_KEY=${apiKey}`);
  console.log('   Set this env var to keep it stable across restarts.');
}

// Middleware
app.use(express.json());

// Serve static assets (JS, CSS, images) without auth
app.use('/assets', express.static(path.join(__dirname, '..', 'public', 'assets')));
app.use('/favicon.ico', express.static(path.join(__dirname, '..', 'public', 'favicon.ico')));

// Serve index.html with injected API key for the browser UI
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const injection = `<script>window.__DASHBOARD_API_KEY__ = "${apiKey}";</script>`;
  html = html.replace('</head>', `${injection}\n  </head>`);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// API key authentication middleware for all /api/* routes
app.use('/api', (req, res, next) => {
  const provided = req.headers['x-api-key'];
  if (!provided) {
    return res.status(401).json({ ok: false, error: 'Missing X-API-Key header' });
  }
  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(apiKey);
  const given = Buffer.from(provided);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return res.status(403).json({ ok: false, error: 'Invalid API key' });
  }
  next();
});

// Routes
app.use('/api/tasks', require('./routes/tasks'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), service: 'openclaw-dashboard' });
});

// Catch-all → SPA index (also injects key for deep links)
app.get('*', (req, res) => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const injection = `<script>window.__DASHBOARD_API_KEY__ = "${apiKey}";</script>`;
  html = html.replace('</head>', `${injection}\n  </head>`);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OpenClaw Dashboard running at http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/tasks`);
  console.log(`🔒 API key auth enabled (X-API-Key header required for /api/* routes)`);
});
