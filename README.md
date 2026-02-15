# OpenClaw Dashboard

A collaborative task dashboard for the OpenClaw agent team.  
Backend: **Express + sql.js (SQLite)**  
Frontend: **React 18 + Bootstrap 5 + Vite**

---

## Quick start

```bash
# Install backend deps (if not already done)
npm install

# Seed with sample data (optional)
npm run seed

# Start the server (serves the pre-built React app)
npm start
```

Then open http://localhost:3420

---

## Development (live reload)

Run two terminals:

**Terminal 1 — Express API:**
```bash
npm run dev:server
```

**Terminal 2 — Vite dev server (React):**
```bash
npm run dev:client
```

The Vite dev server runs on **http://localhost:5173** and proxies `/api/*` requests to the Express server on port 3420.

---

## Building the frontend

```bash
npm run build
```

This runs `vite build` inside `client/` and writes the output to `public/`, where Express serves it as static files.

---

## Features

- **Task list** with status badges, owner colour tags, and priority indicators (red/yellow/green border)
- **Summary stats** row — click a status card to filter by it
- **Filters** by status, owner, priority, token effort, and free-text search
- **Add / edit tasks** via a modal form
- **Task detail modal** with quick status buttons and GitHub URL link
- **Delete** tasks from the detail modal
- **Mobile responsive** Bootstrap grid

---

## API

All routes under `/api/tasks`:

| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/tasks | List tasks (filters: status, owner, priority, estimated_token_effort, search) |
| POST   | /api/tasks | Create task |
| GET    | /api/tasks/:id | Get single task |
| PATCH  | /api/tasks/:id | Update task fields |
| DELETE | /api/tasks/:id | Delete task |

---

## Authentication

All `/api/*` routes require an **API key** supplied via the `X-API-Key` request header.

```bash
curl -H "X-API-Key: your-key-here" http://localhost:3420/api/tasks
```

The browser UI (served from `/`) is automatically exempt — the key is injected into the page at startup and sent transparently by the React frontend.

### Configuring the key

Set the `DASHBOARD_API_KEY` environment variable before starting the server:

```bash
DASHBOARD_API_KEY=mysecretkey npm start
```

If the variable is **not set**, a random 64-character hex key is generated at startup and printed to the console:

```
⚠️  DASHBOARD_API_KEY not set. Generated a temporary key for this session:
   DASHBOARD_API_KEY=a3f9...
   Set this env var to keep it stable across restarts.
```

---

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `PORT` | 3420 | HTTP port |
| `DASHBOARD_API_KEY` | (auto-generated) | API key for `/api/*` routes (`X-API-Key` header) |

---

## Task fields

| Field | Values |
|-------|--------|
| status | backlog · in-progress · review · done |
| owner | norman · ada · mason · atlas · bard · matt · team |
| priority | high · medium · low |
| estimated_token_effort | small (<2,000 tokens) · medium (2,000–8,000) · large (8,000+) — **required** at creation |

### Token Effort Guidance

Estimate the total tokens (input + output) expected to complete the task under normal conditions:

| Tier | Token Range | Use when… |
|------|------------|-----------|
| `small` | < 2,000 | Simple queries, status updates, short summaries |
| `medium` | 2,000–8,000 | Feature implementation, analysis tasks, moderate research |
| `large` | 8,000+ | Complex refactors, multi-file changes, deep research |

---

## Running as a systemd service

Example unit file (`/etc/systemd/system/openclaw-dashboard.service`):

```ini
[Unit]
Description=OpenClaw Dashboard
After=network.target

[Service]
Type=simple
User=matt
WorkingDirectory=/home/matt/.openclaw/workspace/projects/dashboard
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
Environment=PORT=3420
Environment=DASHBOARD_API_KEY=replace-with-your-secret-key

[Install]
WantedBy=multi-user.target
```

After editing:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-dashboard
```

## GitHub PR Auto-Linking (Mason)

When a PR is opened or reopened on any `glovario/*` repo, the workflow at `.github/workflows/pr-dashboard-sync.yml` automatically:

1. Searches the dashboard for a task matching the PR title
2. If found: patches it with the PR URL and sets status → `review`
3. If not found: creates a new task (owner: mason, status: review, priority: medium)

### Setup

Add the `DASHBOARD_API_KEY` secret to the repo:

```bash
gh secret set DASHBOARD_API_KEY --repo glovario/openclaw-dashboard --body "<your-api-key>"
```

Or via GitHub UI: **Settings → Secrets and variables → Actions → New repository secret**

The workflow uses `http://192.168.1.124:3420` as the dashboard base URL (LAN address). Update `DASHBOARD_BASE_URL` in the workflow if this changes.
