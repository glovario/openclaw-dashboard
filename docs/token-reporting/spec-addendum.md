# OC-036.1 Spec Addendum — Token Usage Schema + Attribution Contract

_Last updated: 2026-02-20_

## 1) Token fact table
`token_usage_events`

- `id` INTEGER PK
- `ts` TEXT ISO timestamp (UTC, second precision)
- `source` TEXT NOT NULL (`gateway|dashboard|cron|manual|unknown`)
- `task_id` INTEGER NULL FK -> `tasks.id`
- `agent` TEXT NULL
- `model` TEXT NULL
- `provider` TEXT NULL
- `prompt_tokens` INTEGER NOT NULL DEFAULT 0 CHECK (`>= 0`)
- `completion_tokens` INTEGER NOT NULL DEFAULT 0 CHECK (`>= 0`)
- `total_tokens` INTEGER NOT NULL DEFAULT 0 CHECK (`>= 0`)
- `cost_usd` REAL NOT NULL DEFAULT 0 CHECK (`>= 0`)
- `metadata_json` TEXT NULL (raw event metadata)
- `created_at` TEXT DEFAULT `datetime('now')`

### Required indexes
- `idx_token_usage_ts(ts)`
- `idx_token_usage_task_ts(task_id, ts)`
- `idx_token_usage_agent_ts(agent, ts)`
- `idx_token_usage_model_ts(model, ts)`
- `idx_token_usage_source_ts(source, ts)`

## 2) Attribution contract

### Linked vs unlinked
- **Linked event:** `task_id` is non-null and references an existing task.
- **Unlinked event:** `task_id` is null. These remain in totals when `include_unlinked=true`.

### Contract rules
1. `total_tokens = prompt_tokens + completion_tokens` at ingest time.
2. Missing provider/model/agent values are normalized to `unknown` in grouped views.
3. If `task_id` points to a deleted task, event is treated as unlinked in reporting.
4. Aggregations are 0-safe (use `COALESCE` everywhere).

## 3) Pricing assumptions
- Cost is stored as event-time `cost_usd` (already priced at ingest).
- Reporting endpoint must not recalculate historical prices from mutable lookup tables.
- If price is unknown at ingest, persist `cost_usd = 0` and set metadata flag `"price_status":"missing"`.

## 4) `/api/reports/tokens` response contract

Top-level keys (always present):
- `ok` (boolean)
- `window` (`7|30|90|custom`)
- `filters` (`{ start, end, include_unlinked }`)
- `totals`
- `by_agent[]`
- `by_task[]`
- `by_model[]`
- `trend[]`

`totals` fields:
- `prompt_tokens`, `completion_tokens`, `total_tokens`, `cost_usd`
- `linked_events`, `unlinked_events`, `event_count`

Sort rules:
- `by_agent`, `by_task`, `by_model`: `cost_usd DESC`, then `total_tokens DESC`.

## 5) Acceptance checklist (ready-to-test)
- [ ] Migration creates table + all indexes above.
- [ ] Endpoint returns stable key shape even for empty windows.
- [ ] Window filters `7|30|90` produce bounded results.
- [ ] Custom `start/end` range is inclusive and deterministic.
- [ ] `include_unlinked=false` returns `unlinked_events=0`.
- [ ] Linked/unlinked reconciliation holds: `linked_events + unlinked_events == event_count`.
- [ ] Grouped datasets are correctly sorted.
- [ ] API handles unknown agent/model/provider without null-shape regressions.
