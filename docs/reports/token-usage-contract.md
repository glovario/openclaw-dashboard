# OC-116 — Token Usage Schema + Attribution Contract

## Scope
Defines the canonical contract for token usage persistence (`token_usage_events`) and response shape for `GET /api/reports/tokens`.

## Data model (canonical)

Table: `token_usage_events`

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | INTEGER PK | ✅ | Auto-increment row id |
| `ts` | TEXT (ISO-8601 UTC) | ✅ | Event timestamp used for filtering/trends |
| `agent` | TEXT | ✅ | Agent id/name; use `'unknown'` fallback at query time |
| `model` | TEXT | ❌ | Model identifier; nullable |
| `task_id` | INTEGER | ❌ | FK-like link to `tasks.id` when attributable |
| `prompt_tokens` | INTEGER | ✅ | `>= 0`, default 0 |
| `completion_tokens` | INTEGER | ✅ | `>= 0`, default 0 |
| `total_tokens` | INTEGER | ✅ | `>= 0`; should equal prompt+completion for well-formed events |
| `cost_usd` | REAL | ✅ | `>= 0`, USD normalized |
| `source` | TEXT | ❌ | ingestion source (`gateway`, `manual`, etc.) |
| `metadata_json` | TEXT | ❌ | raw metadata JSON blob for traceability |
| `created_at` | TEXT | ✅ | insertion timestamp |

### Index expectations
- `idx_token_usage_events_ts`
- `idx_token_usage_events_task_id`
- `idx_token_usage_events_agent`
- `idx_token_usage_events_model`

## Attribution rules (task linkage)

1. `task_id` is **nullable by design**.
2. If event can be deterministically linked to a dashboard task, persist `task_id`.
3. If not linkable, persist `NULL` and treat as **unlinked** (do not fabricate ids).
4. Unlinked events are included by default in API unless `include_unlinked=false`.
5. For task rollups, `NULL task_id` rows appear as:
   - `task_display_id = "unlinked"`
   - `task_title = "Unlinked"`

## API contract (`GET /api/reports/tokens`)

### Query params
- `window`: `7 | 30 | 90` (default `30`)
- `start`, `end`: optional ISO timestamps (custom window)
- `include_unlinked`: boolean-like string, default `true`

### Success response shape
```json
{
  "ok": true,
  "window": "30|7|90|custom",
  "filters": {
    "start": "<iso|null>",
    "end": "<iso|null>",
    "include_unlinked": true
  },
  "totals": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0,
    "cost_usd": 0,
    "unlinked_events": 0,
    "linked_events": 0,
    "event_count": 0
  },
  "by_agent": [
    {"agent": "main", "total_tokens": 0, "cost_usd": 0, "event_count": 0}
  ],
  "by_task": [
    {"task_id": 36, "task_display_id": "OC-036", "task_title": "...", "total_tokens": 0, "cost_usd": 0, "event_count": 0}
  ],
  "by_model": [
    {"model": "openai-codex/gpt-5.3-codex", "total_tokens": 0, "cost_usd": 0, "event_count": 0}
  ],
  "trend": [
    {"day": "2026-02-19", "total_tokens": 0, "cost_usd": 0, "event_count": 0}
  ]
}
```

### Error contract
- `400` for invalid window input
- `500` for runtime/db failures
- payload: `{ "ok": false, "error": "<message>" }`

## Acceptance checklist

- [ ] `task_id` nullable ingestion path proven with fixture data.
- [ ] linked + unlinked rollups reconcile to `totals.event_count`.
- [ ] `totals.total_tokens == sum(by_agent.total_tokens)` within filter scope.
- [ ] `include_unlinked=false` excludes all null `task_id` rows from totals/groups.
- [ ] custom range (`start/end`) bypasses preset window logic.
- [ ] invalid window returns `400` with stable error message.
- [ ] API shape matches contract keys exactly.

## Notes for downstream tasks
- OC-118 should treat this as authoritative response contract.
- OC-119 should preserve nullable `task_id` in writes.
- OC-120 QA should test reconciliation against this checklist.
- OC-121 docs/runbook can reuse this section verbatim for semantics.
