# API Reference

This document supplements the `README.md` section about the OpenClaw Dashboard API. The application is an Express server that exposes everything under `/api/*` and serves the React frontend from `/`. All `/api/*` routes require the `X-API-Key` header described below.

---

## Authentication & rate limiting

| Mechanism | Details |
|-----------|---------|
| **API key** | Every `/api/*` request must supply `X-API-Key`. The dashboard prints a generated key when `DASHBOARD_API_KEY` is unset and injects the key into the SPA so the browser never needs to enter it manually. |
| **Rate limits** | `GET` requests: 100/min (external) or 500/min when calling from `localhost`. `POST`, `PATCH`, `DELETE` are throttled to 30/min (external) or 500/min locally. Rate-limit headers follow the Express `express-rate-limit` defaults and the response body uses `Retry-After` + HTTP 429 when the quota is hit. |


## Task endpoints (`/api/tasks`)

### `GET /api/tasks`
- **Purpose:** Returns the task list sorted by priority (high → low) and `updated_at` desc.
- **Query params:** `status`, `owner`, `priority`, `estimated_token_effort`, `search` (performs a LIKE search on title/description/tags).
- **Response:** `{ ok: true, tasks: TaskRow[] }`.

### `GET /api/tasks/:id`
- **Purpose:** Fetch a single task by internal ID. Returns 404 if none exists.
- **Response:** `{ ok: true, task: TaskRow }`.

### `POST /api/tasks`
- **Purpose:** Create a new task. Auto-generates `display_id` and validates `parent_id` when provided.
- **Body:** `{ title, description?, status?, owner?, priority?, github_url?, tags?, estimated_token_effort?, created_by?, parent_id? }`.
- **Validation:** `status`, `owner`, `priority`, `estimated_token_effort` must match the enums enforced in `routes/tasks.js`. Status values include `scope-and-design` as the pre-implementation stage. Defaults: `status='new'`, `owner='matt'`, `priority='medium'`, `estimated_token_effort='unknown'`.
- **Response:** `201 { ok: true, task }`.

### `PATCH /api/tasks/:id`
- **Purpose:** Update editable fields (`title`, `description`, `status`, `owner`, `priority`, `github_url`, `tags`, `estimated_token_effort`, `parent_id`, `created_by`).
- **Body:** Partial object containing only fields to change.
- **Behavior:** Invalid enums result in `400`. Each actual change inserts a `task_history` row and the handler returns the updated task.
- **OC-141 enforcement:** moving a task to `in-progress` for named agents now requires an active assignee heartbeat binding; otherwise API returns `409` with a clear binding error.
- **OC-143 enforcement:** moving/creating tasks in `review`, `for-approval`, or `done` requires `github_url` (or explicit `N/A`) for traceability.

### `DELETE /api/tasks/:id`
- **Purpose:** Deletes the task and cascades history/comments/dependencies.
- **Response:** `{ ok: true }`.


## Task history & dependencies

### `GET /api/tasks/:id/history`
- **Purpose:** Returns up to `limit` audit entries (default 50) showing field changes recorded in `task_history`.
- **Query:** `limit` (integer).
- **Response:** `{ ok: true, history: [...] }`.

### `GET /api/tasks/:id/dependencies`
- **Purpose:** Lists all tasks that the given task depends on via `task_dependencies.blocked_by`.

### `POST /api/tasks/:id/dependencies`
- **Purpose:** Adds a blocked-by link. Body must include `blocked_by` (another task ID).
- **Validation:** Rejects self-dependencies and immediate circular links (two-way).

### `DELETE /api/tasks/:id/dependencies/:blockerId`
- **Purpose:** Removes a specific blocked-by relationship.


## Assignee binding endpoints (OC-141)

### `POST /api/tasks/agent-bindings/heartbeat`
- **Purpose:** Upsert assignee presence heartbeat (`owner`, optional `session_key`, optional `state`).
- **Use:** keep live binding fresh for `in-progress` gate enforcement.

### `GET /api/tasks/agent-bindings`
- **Purpose:** List current owner bindings with computed `active` flag.
- **Response:** `{ ok, bindings, ttl_minutes }`.

### `GET /api/tasks/agent-bindings/escalation-scan?staleMinutes=120`
- **Purpose:** Return in-progress tasks stale beyond threshold plus owner binding activity data for watchdog/escalation workflows.


## Comments (`/api/tasks/:id/comments`)

### `GET /api/tasks/:id/comments`
- **Purpose:** Lists comments for a task sorted oldest-first.
- **Response:** `{ ok: true, comments: CommentRow[] }`.

### `POST /api/tasks/:id/comments`
- **Purpose:** Adds a comment. Body must include `author` and `body`.
- **Response:** `201 { ok: true, comment }`.


## Reports endpoints (`/api/reports`)

### `GET /api/reports/tokens`
- **Purpose:** Aggregated token/cost reporting over a rolling window (`7|30|90`) or custom `start/end` timestamps.
- **Query params:** `window`, `start`, `end`, `include_unlinked` (`true` default).
- **Response:** `{ ok, window, filters, totals, by_agent, by_task, by_model, trend }`.

### `POST /api/reports/tokens/events`
- **Purpose:** Persist a token-usage fact row for downstream reporting/QA.
- **Body:** `{ ts?, source?, task_id?, task_display_id?, agent?, model?, prompt_tokens?, completion_tokens?, total_tokens?, cost_usd?, metadata? }`.
- **Behavior:**
  - Resolves `task_display_id` to `task_id` when `task_id` is omitted.
  - Validates referenced task exists when task linkage is provided.
  - Defaults `total_tokens = prompt_tokens + completion_tokens` when omitted.
  - Stores metadata as JSON string in `metadata_json`.
- **Response:** `201 { ok: true, event }`.

## System endpoints

### `GET /api/health`
- **Purpose:** Light health check used by the dashboard to confirm the server is running.
- **Response:** `{ ok: true, ts, service }` (handled directly in `src/server.js`).

### `GET /api/system/health`
- **Purpose:** Returns host-level stats (CPU/memory/disk usage, uptime) and pings the gateway + dashboard to detect downstream failures.
- **Response shape:**

```json
{
  "ok": true,
  "cpu": { "pct": 12 },
  "memory": { "totalGb": 15, "usedGb": 5, "pct": 33 },
  "disk": { "total": 120, "used": 40, "pct": 33 },
  "uptime": 123456,
  "services": {
    "gateway": { "up": true, "status": 200 },
    "dashboard": { "up": true, "status": 200 }
  }
}
```


## Frontend integration

The React `client/` application uses `api.js` helpers to call these endpoints. The root HTML injected by `server.js` exposes `window.__DASHBOARD_API_KEY__` so the browser UI never needs to prompt for secrets.
