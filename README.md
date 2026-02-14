# 🐾 OpenClaw Dashboard

A collaborative task dashboard for the OpenClaw agent team — Norman, Ada, Mason, Atlas, Bard, and Matt.

Track tasks, priorities, owners, and GitHub links. Works great on mobile.

## Features

- **Mobile-friendly** dark UI with status badges and owner colour tags
- **REST API** — agents can create, update and query tasks programmatically
- **SQLite** — local-first, zero-dependency storage
- **Filter & search** — by status, owner, priority, or free text
- **GitHub links** — link tasks to PRs/repos

## Quick Start

```bash
cd /home/matt/.openclaw/workspace/projects/dashboard

# Install dependencies
npm install

# Seed starter tasks
node src/seed.js

# Start server (port 3420 by default)
npm start
```

Open **http://localhost:3420** in your browser.

For mobile access on your local network:  
`http://<machine-ip>:3420`

## Environment Variables

| Variable             | Default        | Description                          |
|----------------------|----------------|--------------------------------------|
| `PORT`               | `3420`         | HTTP port to listen on               |
| `DB_PATH`            | `data/dashboard.db` | Path to SQLite database         |
| `DASHBOARD_PASSWORD` | *(unset)*      | Enable basic auth with this password |
| `DASHBOARD_USER`     | `openclaw`     | Username for basic auth              |

Example with auth enabled:

```bash
DASHBOARD_PASSWORD=secret npm start
```

## REST API

All endpoints return `{ ok: true, ... }` on success or `{ ok: false, error: "..." }` on failure.

### Tasks

| Method   | Path              | Description           |
|----------|-------------------|-----------------------|
| `GET`    | `/api/tasks`      | List tasks (filterable) |
| `GET`    | `/api/tasks/:id`  | Get single task       |
| `POST`   | `/api/tasks`      | Create task           |
| `PATCH`  | `/api/tasks/:id`  | Update task fields    |
| `DELETE` | `/api/tasks/:id`  | Delete task           |

### Query Parameters (GET /api/tasks)

- `status` — `backlog` | `in-progress` | `review` | `done`
- `owner` — `norman` | `ada` | `mason` | `atlas` | `bard` | `matt` | `team`
- `priority` — `low` | `medium` | `high`
- `search` — free text search in title, description, tags

### Task Schema

```json
{
  "id": 1,
  "title": "Task title",
  "description": "Details",
  "status": "backlog",
  "owner": "norman",
  "priority": "high",
  "github_url": "https://github.com/glovario/...",
  "tags": "api,frontend",
  "created_at": "2026-02-14T19:00:00",
  "updated_at": "2026-02-14T19:00:00"
}
```

### API Examples

```bash
# List all in-progress tasks
curl http://localhost:3420/api/tasks?status=in-progress

# Create a task
curl -X POST http://localhost:3420/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Fix heartbeat bug","owner":"norman","priority":"high","status":"in-progress"}'

# Update task status
curl -X PATCH http://localhost:3420/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"status":"done"}'

# Search
curl "http://localhost:3420/api/tasks?search=heartbeat"
```

## Run as a Service (systemd)

```ini
# /etc/systemd/system/openclaw-dashboard.service
[Unit]
Description=OpenClaw Dashboard
After=network.target

[Service]
ExecStart=/usr/bin/node /home/matt/.openclaw/workspace/projects/dashboard/src/server.js
WorkingDirectory=/home/matt/.openclaw/workspace/projects/dashboard
Restart=always
Environment=PORT=3420
User=matt

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now openclaw-dashboard
```

## Project Structure

```
dashboard/
├── src/
│   ├── server.js        Express app & server
│   ├── db.js            SQLite setup & schema
│   ├── seed.js          Seed starter tasks
│   └── routes/
│       └── tasks.js     CRUD route handlers
├── public/
│   ├── index.html       SPA shell
│   ├── style.css        Dark mobile-friendly UI
│   └── app.js           Vanilla JS frontend
├── data/                SQLite database (git-ignored)
├── package.json
└── README.md
```
