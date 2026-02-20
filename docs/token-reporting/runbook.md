# OC-036.6 Token Metrics Semantics + Troubleshooting Runbook

## Metric semantics
- `prompt_tokens`: input tokens billed for request context
- `completion_tokens`: output tokens generated
- `total_tokens`: prompt + completion (ingestion should provide authoritative total)
- `cost_usd`: normalized USD cost at ingest time
- **Linked event**: has `task_id`
- **Unlinked event**: `task_id` is null

## Common discrepancy checks
1. Compare API totals to SQL:
   - `SELECT SUM(total_tokens), SUM(cost_usd) FROM token_usage_events ...`
2. Validate filters applied identically (`window` vs `start/end`).
3. Check for null/unknown `agent` and `model` buckets.
4. Confirm whether dashboard toggled `include_unlinked`.

## Operational queries
- Top unlinked spend:
  `SELECT date(ts), SUM(cost_usd) FROM token_usage_events WHERE task_id IS NULL GROUP BY date(ts);`
- High-cost models:
  `SELECT model, SUM(cost_usd) FROM token_usage_events GROUP BY model ORDER BY 2 DESC;`

## Response guarantees
- Endpoint returns zero-safe values and empty arrays (never missing keys) for empty windows.

## Fixture payloads for QA/UI
- Populated + include unlinked: `docs/token-reporting/fixtures/reports-populated-include-unlinked.json`
- Populated + linked only: `docs/token-reporting/fixtures/reports-populated-linked-only.json`
- Empty custom window: `docs/token-reporting/fixtures/reports-empty-window.json`

Refresh fixtures after contract changes:
- `npm run generate:reports-fixtures`
