# OC-036.1 Spec Addendum — Token Usage Schema + Attribution Contract

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
- `metadata_json` TEXT nullable JSON blob for provider/raw attribution details

## Attribution contract
- **Linked event**: `task_id` present and points to existing `tasks.id`.
- **Unlinked event**: `task_id` null (kept for platform spend visibility).
- `/api/reports/tokens` supports `include_unlinked=true|false`.
- Aggregates always return 0-safe totals (`COALESCE`).

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
- [ ] Migration creates `token_usage_events` + indexes
- [ ] Endpoint returns stable shape even when empty
- [ ] Window filters (7/30/90) work
- [ ] Custom `start/end` works
- [ ] `include_unlinked=false` excludes null `task_id` events
- [ ] Top lists sorted by `cost_usd DESC`, then `total_tokens DESC`
