# Database schema reference

The dashboard uses an on-disk `sql.js` (SQLite in WASM) database persisted at `data/dashboard.db`. The schema is defined in `src/db.js` when the connection is established. This document mirrors the schema and describes derived columns.

---

## `tasks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Internal identifier used by the API and dependencies.
| `title` | TEXT NOT NULL | Task title.
| `description` | TEXT DEFAULT '' | Markdown-friendly description.
| `status` | TEXT NOT NULL DEFAULT 'backlog' | Enum: `new`, `backlog`, `in-progress`, `on-hold`, `for-approval`, `review`, `done`.
| `owner` | TEXT NOT NULL DEFAULT 'matt' | Enum of agent/owner handles (e.g. `norman`, `bard`, `team`).
| `priority` | TEXT NOT NULL DEFAULT 'medium' | `low`, `medium`, `high`.
| `github_url` | TEXT DEFAULT '' | Optional link to related PR/issue.
| `tags` | TEXT DEFAULT '' | CSV string for filtering and display.
| `estimated_token_effort` | TEXT NOT NULL DEFAULT 'unknown' | Enum: `unknown`, `small`, `medium`, `large` (used by the UI and reporting). Added during migrations (OC-099).
| `created_at` | TEXT NOT NULL DEFAULT `datetime('now')` | UTC timestamp.
| `updated_at` | TEXT NOT NULL DEFAULT `datetime('now')` | Automatically updated on changes.
| `display_id` | TEXT | Human-friendly ID like `OC-015`. Backfilled during schema migrations.
| `created_by` | TEXT NOT NULL DEFAULT 'unknown' | Helpful audit trail when tasks are created programmatically.
| `parent_id` | INTEGER REFERENCES tasks(id) ON DELETE SET NULL | Optional parent for subtasks.

`tasks` also gets altered columns automatically when the file already existed. The schema applies the migrations in order to avoid repeated `ALTER TABLE` errors.

---

## `comments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Internal identifier.
| `task_id` | INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE | Task that the comment belongs to.
| `author` | TEXT NOT NULL | Owner handle (e.g. `norman`).
| `body` | TEXT NOT NULL | Markdown/TTY-friendly comment text.
| `created_at` | TEXT NOT NULL DEFAULT `datetime('now')` | Timestamp for ordering.

Comments are retrieved via `/api/tasks/:id/comments` and appended to the UI task detail view.

---

## `task_history`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Internal history entry.
| `task_id` | INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE | Task under audit.
| `field_name` | TEXT NOT NULL | Field that changed (e.g. `status`).
| `old_value` | TEXT | Value before the change.
| `new_value` | TEXT | Value after the change.
| `author` | TEXT NOT NULL DEFAULT 'system' | Source of the change (header `X-Author` or system).
| `changed_at` | TEXT NOT NULL DEFAULT `datetime('now')` | Timestamp recorded at update time.

Every `PATCH /api/tasks/:id` call records each changed field to allow timeline and diffing. The `GET /api/tasks/:id/history` endpoint reads from this table.

---

## `task_dependencies`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Internal link identifier.
| `task_id` | INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE | Task that has blockers.
| `blocked_by` | INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE | The task that must finish first.

The table enforces `UNIQUE(task_id, blocked_by)` and prohibits self-dependencies with a `CHECK`. Circular dependencies are guarded at the application level by checking for reverse links before inserts. Dependencies can be created/removed via `/api/tasks/:id/dependencies`.

---

## Persistence helpers
The `src/db.js` module exports convenience helpers (`run`, `all`, `get`, `insert`, `persist`). It writes the binary blob back to disk after each `INSERT`, `UPDATE`, or `DELETE` to keep the file in sync. If you need to snapshot or migrate between environments, copy `data/dashboard.db` along with the schema documentation.
