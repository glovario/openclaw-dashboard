# OC-116 — Token Usage Schema + Attribution Contract

Status: Draft for implementation handoff  
Owner: Ada (architecture), consumers: Mason/Malik/Juno/Quinn/Elias

## 1) Persistence schema contract

Table: `token_usage_events`

Required columns:

- `id` INTEGER PRIMARY KEY
- `created_at` TEXT NOT NULL DEFAULT `datetime('now')` (UTC)
- `source` TEXT NOT NULL
  - expected values: `openclaw.event_stream`, `manual.backfill`, `synthetic.test`
- `provider` TEXT NOT NULL
  - e.g. `openai`, `anthropic`
- `model` TEXT NOT NULL
  - provider model id / alias-resolved id
- `prompt_tokens` INTEGER NOT NULL DEFAULT 0 CHECK (`prompt_tokens >= 0`)
- `completion_tokens` INTEGER NOT NULL DEFAULT 0 CHECK (`completion_tokens >= 0`)
- `total_tokens` INTEGER NOT NULL CHECK (`total_tokens = prompt_tokens + completion_tokens`)
- `cost_usd` REAL NOT NULL DEFAULT 0 CHECK (`cost_usd >= 0`)
- `task_id` INTEGER NULL REFERENCES `tasks(id)` ON DELETE SET NULL
- `task_display_id` TEXT NULL (denormalized for diagnostics)
- `agent` TEXT NULL (Norman/Ada/etc)
- `session_key` TEXT NULL
- `request_id` TEXT NULL
- `meta_json` TEXT NULL (JSON blob, optional)

Indexes:

- `idx_token_usage_events_created_at` on (`created_at`)
- `idx_token_usage_events_task_id_created_at` on (`task_id`, `created_at`)
- `idx_token_usage_events_agent_created_at` on (`agent`, `created_at`)
- `idx_token_usage_events_model_created_at` on (`model`, `created_at`)
- `idx_token_usage_events_source_created_at` on (`source`, `created_at`)

## 2) Attribution / linkage rules

1. `task_id` is **nullable** and must stay nullable.
2. Resolve task linkage in this precedence order:
   1) explicit numeric `task_id` in event payload
   2) `task_display_id` lookup (`OC-###` -> `tasks.id`)
   3) fallback `NULL` (unlinked)
3. Never drop events when linkage fails; persist as unlinked.
4. If task is later deleted, preserve event and set `task_id = NULL` via FK action.
5. `task_display_id` can remain populated even when `task_id` is null for forensic traceability.

## 3) Pricing assumptions

1. `cost_usd` is persisted as point-in-time computed value from configured model pricing.
2. Aggregation endpoint must treat persisted `cost_usd` as source of truth (no recomputation).
3. Missing pricing config: ingest event with `cost_usd = 0`, set `meta_json.pricing_missing = true`.
4. Currency normalization: always USD in storage and API output.

## 4) `/api/reports/tokens` response contract

Required top-level shape:

```json
{
  "ok": true,
  "window": { "from": "ISO", "to": "ISO", "preset": "7d|30d|90d|custom" },
  "totals": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0,
    "cost_usd": 0,
    "event_count": 0
  },
  "coverage": {
    "linked_events": 0,
    "unlinked_events": 0,
    "linked_cost_usd": 0,
    "unlinked_cost_usd": 0
  },
  "by_agent": [],
  "by_task": [],
  "by_model": [],
  "trend": []
}
```

Grouping row minimum fields:

- `key` (agent/task/model identifier)
- `label`
- `prompt_tokens`
- `completion_tokens`
- `total_tokens`
- `cost_usd`
- `event_count`

Trend row minimum fields:

- `bucket_start` (ISO UTC)
- token/cost fields matching totals schema

Filter contract:

- `window`: `7d|30d|90d|custom` (default `7d`)
- custom requires `from` and `to` (ISO)
- `include_unlinked`: `true|false` (default `true`)

## 5) Acceptance checklist

- [ ] Migration creates schema and indexes above.
- [ ] Ingestion writes events even without task linkage.
- [ ] `total_tokens` invariant enforced (`prompt + completion`).
- [ ] Missing pricing handled without ingest failure.
- [ ] `/api/reports/tokens` returns required contract keys always.
- [ ] Empty window returns zeros + empty arrays, not nulls.
- [ ] Contract tests lock response keys and numeric types.
- [ ] QA reconciliation confirms totals = grouped rollups within tolerance 0.
