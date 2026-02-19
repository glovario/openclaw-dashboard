# OC-036.1 Spec Addendum — Token Usage Schema + Attribution Contract

## Token fact table
`token_usage_events`

- `id` INTEGER PK
- `ts` TEXT ISO timestamp (UTC)
- `source` TEXT (`gateway|dashboard|cron|manual|unknown`)
- `task_id` INTEGER nullable FK -> `tasks.id`
- `agent` TEXT nullable (owner/actor label when known)
- `model` TEXT nullable (provider/model alias or raw model id)
- `prompt_tokens` INTEGER `CHECK >= 0` default `0`
- `completion_tokens` INTEGER `CHECK >= 0` default `0`
- `total_tokens` INTEGER `CHECK >= 0` default `0` (writer should set `prompt+completion`)
- `cost_usd` REAL `CHECK >= 0` default `0`
- `metadata_json` TEXT nullable JSON blob for provider/raw attribution details

### Indexes + integrity
- `idx_token_usage_events_ts(ts)` for window scans.
- `idx_token_usage_events_task_id(task_id)` for task rollups.
- `idx_token_usage_events_agent(agent)` and `idx_token_usage_events_model(model)` for grouped reports.
- `task_id` is nullable by design so unlinked spend is preserved.

## Attribution contract
- **Linked event**: `task_id` present and points to existing `tasks.id`.
- **Unlinked event**: `task_id` null (kept for platform spend visibility).
- Linkage is immutable-at-write for historical accuracy; correction is done via compensating event, not in-place mutation.
- `/api/reports/tokens` supports `include_unlinked=true|false`.
- Aggregates always return 0-safe totals (`COALESCE`).
- Unknown dimensions (`agent`, `model`, `source`) must be normalized to `unknown` in grouped outputs to avoid dropped buckets.

## Pricing assumptions (v1 contract)
- `cost_usd` is written at ingestion time using then-current provider pricing metadata.
- Historical events are not retroactively repriced when providers change rates.
- Dashboard reports are therefore **ledger-consistent** (sum of stored facts), not simulated-current-price estimates.
- Any repricing project must be a separate backfill stream with explicit provenance in `metadata_json`.

## `/api/reports/tokens` response contract
- `ok`
- `window`: `7|30|90|custom`
- `filters`: `{start,end,include_unlinked}`
- `totals`: prompt/completion/total tokens + cost + linked/unlinked/event counts
- `by_agent[]`: `{agent,total_tokens,cost_usd,event_count}`
- `by_task[]`: `{task_id,task_display_id,task_title,total_tokens,cost_usd,event_count}`
- `by_model[]`: `{model,total_tokens,cost_usd,event_count}`
- `trend[]`: `{day,total_tokens,cost_usd,event_count}`

## Acceptance checklist
- [x] Migration creates `token_usage_events` + indexes
- [x] Endpoint returns stable shape even when empty
- [x] Window filters (7/30/90) work
- [x] Custom `start/end` works
- [x] `include_unlinked=false` excludes null `task_id` events
- [x] Top lists sorted by `cost_usd DESC`, then `total_tokens DESC`
- [ ] Contract tests added for empty + custom-window + include-unlinked=false invariants
