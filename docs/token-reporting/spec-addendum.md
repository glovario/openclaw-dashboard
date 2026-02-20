# OC-036.1 Spec Addendum — Token Usage Schema + Attribution Contract

> Finalized: 2026-02-20 (execution run hardening pass)

## Token fact table
`token_usage_events`

- `id` INTEGER PK
- `ts` TEXT ISO timestamp (UTC)
- `source` TEXT (gateway|dashboard|cron|manual|unknown)
- `task_id` INTEGER nullable FK -> `tasks.id`
- `agent` TEXT nullable
- `model` TEXT nullable
- `prompt_tokens` INTEGER >= 0
- `completion_tokens` INTEGER >= 0
- `total_tokens` INTEGER >= 0
- `cost_usd` REAL >= 0
- `event_uid` TEXT nullable UNIQUE (provider/source dedupe key)
- `metadata_json` TEXT nullable JSON blob for provider/raw attribution details

## Attribution contract
- **Linked event**: `task_id` present and points to existing `tasks.id`.
- **Unlinked event**: `task_id` null (kept for platform spend visibility).
- `/api/reports/tokens` supports `include_unlinked=true|false`.
- Aggregates always return 0-safe totals (`COALESCE`).

## Ingestion contract
- POST `/api/reports/tokens/events` accepts one event object or `{ events: [...] }`.
- Task linkage is strict: `task_id` must reference existing `tasks.id` or be `null`.
- Idempotency: duplicate `event_uid` writes are deduped (reported as `deduped` count).
- Response: `{ok, inserted, deduped, rejected[]}` where rejected includes per-event validation reason.

## `/api/reports/tokens` response contract
- `ok`: boolean
- `window`: `7|30|90|custom`
- `filters`: `{start,end,include_unlinked}` where `start/end` are UTC ISO strings for resolved window
- `totals`: `{prompt_tokens,completion_tokens,total_tokens,cost_usd,event_count,linked_events,unlinked_events}`
- `by_agent[]`: `{agent,total_tokens,cost_usd,event_count}` (`agent='unknown'` when null)
- `by_task[]`: `{task_id,task_display_id,task_title,total_tokens,cost_usd,event_count}`
- `by_model[]`: `{model,total_tokens,cost_usd,event_count}` (`model='unknown'` when null)
- `trend[]`: `{day,total_tokens,cost_usd,event_count}` with `day` normalized to UTC date (`YYYY-MM-DD`)
- Machine-checkable schema: `docs/token-reporting/reports-response.schema.json`

## Pricing assumptions (v1)
- Cost is persisted as **authoritative event value** in `cost_usd` at ingest time.
- No historical cost re-pricing in API queries.
- If provider cost is unknown at ingest, store `cost_usd = 0` and add reason in `metadata_json`.

## Attribution linkage rules (v1)
- `task_id` must reference an existing task at write time, or be `NULL`.
- Deleted tasks are treated as historical denormalization risk; reporting should LEFT JOIN tasks and fall back to:
  - `task_display_id = 'deleted-task'`
  - `task_title = 'Deleted task'`
- Duplicate provider events should be prevented in ingestion path using `event_uid` unique key where available.
- If `event_uid` is unavailable, fallback dedupe key MAY be stored in `metadata_json.idempotency_key`.

## Acceptance checklist
- [x] Migration creates `token_usage_events` + indexes
- [x] Endpoint returns stable shape even when empty
- [x] Window filters (7/30/90) work
- [x] Custom `start/end` works
- [x] `include_unlinked=false` excludes null `task_id` events
- [x] Top lists sorted by `cost_usd DESC`, then `total_tokens DESC`
- [x] Deleted task linkage does not break aggregation responses
- [x] Unknown-cost events are represented with `cost_usd=0` + metadata reason
- [x] Duplicate ingest replay is ignored via `event_uid` uniqueness

Validation evidence: `node scripts/test-reports-contract.js` (includes deleted-task fallback and dedupe assertions).
