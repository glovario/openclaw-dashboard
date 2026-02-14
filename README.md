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

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `PORT` | 3420 | HTTP port |
| `DASHBOARD_PASSWORD` | (none) | Enable basic auth on `/api` |
| `DASHBOARD_USER` | openclaw | Basic auth username |

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
