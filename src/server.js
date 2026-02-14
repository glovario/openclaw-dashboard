const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3420;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Optional basic auth (set DASHBOARD_PASSWORD env var to enable)
if (process.env.DASHBOARD_PASSWORD) {
  const basicAuth = require('express-basic-auth');
  app.use('/api', basicAuth({
    users: { [process.env.DASHBOARD_USER || 'openclaw']: process.env.DASHBOARD_PASSWORD },
    challenge: true
  }));
  console.log('🔒 API basic auth enabled');
}

// Routes
app.use('/api/tasks', require('./routes/tasks'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), service: 'openclaw-dashboard' });
});

// Catch-all → SPA index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OpenClaw Dashboard running at http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/tasks`);
});
