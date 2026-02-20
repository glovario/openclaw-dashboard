# OC-036.1 Token Usage Schema + Attribution Contract Addendum (2026-02-20)

Status: implementation contract locked for downstream build/QA/docs subtasks.

## 1) `token_usage_events` canonical schema (storage contract)

Required columns (non-null unless noted):

- `id` INTEGER PRIMARY KEY
- `ts` TEXT NOT NULL (UTC ISO-8601; event timestamp)
- `task_id` INTEGER NULL (nullable; NULL means unlinked usage)
- `agent` TEXT NOT NULL (`norman|ada|mason|...` or `unknown` fallback)
- `model` TEXT NOT NULL (provider/model or alias)
- `prompt_tokens` INTEGER NOT NULL DEFAULT 0
- `completion_tokens` INTEGER NOT NULL DEFAULT 0
- `total_tokens` INTEGER NOT NULL (must equal prompt+completion at write-time)
- `cost_usd` REAL NOT NULL DEFAULT 0
- `source` TEXT NOT NULL (`gateway`, `dashboard`, `import`, etc)
- `meta_json` TEXT NULL (optional source payload)

Indexes required:

- `idx_token_usage_events_ts` on `(ts)`
- `idx_token_usage_events_task_id_ts` on `(task_id, ts)`
- `idx_token_usage_events_agent_ts` on `(agent, ts)`
- `idx_token_usage_events_model_ts` on `(model, ts)`

## 2) Attribution rules (linked vs unlinked)

- Linked usage: rows where `task_id IS NOT NULL` and task exists (or existed at ingest).
- Unlinked usage: rows where `task_id IS NULL`.
- API default includes both (`include_unlinked=true`).
- When `include_unlinked=false`, unlinked rows are fully excluded from totals + breakdowns.

## 3) Pricing assumptions (reporting contract)

- `cost_usd` is computed during ingest and persisted as fact.
- Reports aggregate persisted `cost_usd` values (no retroactive repricing in endpoint).
- If pricing table changes later, repricing must be explicit migration/backfill task.

## 4) `GET /api/reports/tokens` response contract

Endpoint inputs:

- `window=7|30|90` (default `30`) OR `start`/`end` UTC timestamps
- `include_unlinked=true|false` (default `true`)

Response fields (required):

- `ok` boolean
- `window` (`7|30|90|custom`)
- `filters` `{ start, end, include_unlinked }`
- `totals` `{ prompt_tokens, completion_tokens, total_tokens, cost_usd, unlinked_events, linked_events, event_count }`
- `by_agent[]` rows: `{ agent, total_tokens, cost_usd, event_count }`
- `by_task[]` rows: `{ task_id, task_display_id, task_title, total_tokens, cost_usd, event_count }`
- `by_model[]` rows: `{ model, total_tokens, cost_usd, event_count }`
- `trend[]` rows: `{ day, total_tokens, cost_usd, event_count }`

Sorting:

- `by_agent`, `by_task`, `by_model`: `cost_usd DESC, total_tokens DESC`
- `trend`: `day ASC`

## 5) Reconciliation invariants

- `totals.linked_events + totals.unlinked_events == totals.event_count`
- `sum(by_agent.event_count) == totals.event_count`
- `sum(by_model.event_count) == totals.event_count`
- If `include_unlinked=false`: `totals.unlinked_events == 0`

## 6) Acceptance checklist (handoff-ready)

- [ ] migration exists with required columns/indexes
- [ ] ingestion writes nullable `task_id` and enforces non-negative tokens/cost
- [ ] endpoint returns full contract keys for empty windows (zeroed totals, empty arrays)
- [ ] sorting and reconciliation checks pass
- [ ] regression script `scripts/validate-token-reports.js` passes against deployed API
