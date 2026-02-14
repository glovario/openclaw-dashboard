# Agent Summary — OpenClaw Dashboard

**Built by:** Norman (subagent)  
**Date:** 2026-02-14  
**Session:** dashboard-design-build

---

## What Was Built

A full-stack collaborative task dashboard for the OpenClaw agent team (Norman, Ada, Mason, Atlas, Bard, Matt).

### Stack
- **Backend:** Node.js 18 + Express
- **Database:** SQLite via `sql.js` (pure WASM — no native compilation required, works on any Node version)
- **Frontend:** React 18 + Vite + Bootstrap 5 (dark theme) — mobile-first SPA
- **Build:** `npm run build` in `client/` → output to `public/`, served by Express
- **Dev:** `npm run dev:client` (Vite on :5173, proxies `/api` to Express) + `npm run dev:server`
- **API:** REST — all agents can create/read/update/delete tasks programmatically

### Features
- Task CRUD with full field set: title, description, status, owner, priority, github_url, tags
- Filter by status / owner / priority; free-text search across title/description/tags
- Status badges (`backlog` | `in-progress` | `review` | `done`)
- Owner colour tags (distinct colour per agent)
- Priority dots (red/orange/grey)
- GitHub URL linking per task
- Mobile-friendly bottom-sheet modal for create/edit
- Optional basic auth via `DASHBOARD_PASSWORD` env var

### Files
```
dashboard/
├── src/server.js          Express app (port 3420)
├── src/db.js              sql.js SQLite wrapper with file persistence
├── src/seed.js            Seeds 10 starter tasks
├── src/routes/tasks.js    CRUD route handlers
├── public/index.html      SPA shell
├── public/style.css       Dark mobile-first UI
├── public/app.js          Vanilla JS frontend
└── README.md              Full setup & API docs
```

---

## GitHub Repo

**https://github.com/glovario/openclaw-dashboard**

---

## How to Start the Server

```bash
cd /home/matt/.openclaw/workspace/projects/dashboard

# First time only
npm install
node src/seed.js   # seed starter tasks (skips if tasks already exist)

# Start
npm start
# or: PORT=3420 npm start
```

Dashboard: **http://localhost:3420**  
API: **http://localhost:3420/api/tasks**  
Health: **http://localhost:3420/api/health**

For mobile on local network: `http://<machine-ip>:3420`

### Run as a persistent service

```bash
sudo systemctl enable --now openclaw-dashboard
# (see README for systemd unit file)
```

---

## Seeded Starter Tasks (10)

| # | Title | Owner | Priority | Status |
|---|-------|-------|----------|--------|
| 1 | Improve heartbeat reliability & batching | Norman | High | In Progress |
| 2 | Agent coordination protocol — shared task awareness | Team | High | Backlog |
| 3 | Build openclaw-dashboard REST API and frontend | Norman | High | **Done** |
| 4 | Ada: implement email triage automation | Ada | Medium | Backlog |
| 5 | Mason: GitHub PR review assistant | Mason | Medium | Backlog |
| 6 | Atlas: system health monitoring widget | Atlas | Medium | Backlog |
| 7 | Bard: daily standup summary generation | Bard | Low | Backlog |
| 8 | MEMORY.md review and update cycle | Team | Medium | Backlog |
| 9 | Dashboard: add authentication layer | Matt | Medium | Backlog |
| 10 | Define agent capability registry | Matt | High | In Progress |

---

## Suggested Next Tasks

1. **Start the server and set it up as a systemd service** — so it survives reboots and is always available at `:3420`

2. **Add API key auth** — The current optional basic auth is fine for the browser, but agents should use a header-based API key (`X-API-Key`) for programmatic access without browser prompts

3. **Norman heartbeat integration** — Have Norman's heartbeat check the dashboard for tasks assigned to `norman` with `in-progress` status and surface them in the daily context

4. **Bard standup generation** — Connect Bard to the API (`GET /api/tasks?status=done`) to generate a daily summary of completed vs pending items

5. **Agent webhook / push** — Add a `POST /api/tasks/:id/comment` endpoint (or a notes table) so agents can append timestamped notes to tasks without overwriting the full description

6. **Mobile PWA** — Add a `manifest.json` and service worker so the dashboard can be added to the home screen on Matt's phone

7. **Expose on LAN** — Confirm the machine IP and bookmark `http://<ip>:3420` on Matt's phone

8. **Mason PR linking** — When Mason opens a PR, have it auto-create or update a dashboard task with the GitHub URL

---

## 2026-02-14 — React + Bootstrap 5 frontend rebuild

Rebuilt the frontend from scratch as a proper React 18 + Bootstrap 5 SPA (Vite build tooling). All backend code (Express, sql.js, routes) is unchanged.

### What changed
- Created `client/` directory with a Vite + React project
- Installed Bootstrap 5 (via npm, not CDN)
- Built the app into `public/` which the Express backend already serves as static files
- Dev workflow: `npm run dev:server` (port 3420) + `npm run dev:client` (port 5173 with API proxy)

### Components
- `App.jsx` — main app, state, data fetching, modal orchestration
- `FilterBar.jsx` — search + dropdowns for status/owner/priority
- `TaskCard.jsx` — card with priority border, status badge, owner colour badge, tags
- `TaskDetailModal.jsx` — full detail view, quick-status buttons, GitHub link, edit/delete
- `AddTaskModal.jsx` — wrapper around TaskForm for new tasks
- `TaskForm.jsx` — controlled form for create/edit
- `api.js` — thin fetch wrapper for all REST calls
- `constants.js` — shared status/owner/priority config

### Styling
- CSS custom properties for each owner's colour
- Priority indicated by left border colour (red/yellow/green)
- Bootstrap responsive grid: 1 col mobile, 2 col large, 3 col XL
