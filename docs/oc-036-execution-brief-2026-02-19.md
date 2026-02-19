# OC-036 Execution Brief (2026-02-19)

Purpose: unblock active in-progress subtasks with a single implementation contract and handoff checklist.

## Locked implementation contract

- **Attribution model**
  - `token_usage_events.task_id` is nullable.
  - `task_id IS NULL` rows are treated as **unlinked usage** and included only when `include_unlinked=true` (default true).
- **Required event fields**
  - `ts` (UTC timestamp), `agent_id`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `cost_usd`, `source`.
- **Aggregation endpoint**
  - `GET /api/reports/tokens`
  - Supported window query params: `window=7d|30d|90d|custom`, `from`, `to` for custom.
  - Returns:
    - `kpis` (total tokens, total cost, linked tokens/cost, unlinked tokens/cost)
    - `trend` (daily buckets)
    - `by_agent`
    - `by_task`
    - `by_model`
- **Reconciliation invariant**
  - `sum(by_task.tokens) + unlinked.tokens == kpis.total_tokens`
  - Same rule for `cost_usd`.

## QA acceptance matrix

1. Empty window returns zeroed structures, not nulls.
2. Linked-only filter excludes unlinked rows.
3. Custom date window is inclusive and UTC-safe.
4. Totals reconcile across KPI + grouped aggregates.
5. UI handles `no data`, API error, and partial dataset states.

## Owner handoffs / unblock sequence

1. **Mason (OC-117)**: land migration + ingestion write path with nullable `task_id`.
2. **Malik (OC-118)**: wire aggregation query and contract tests on top of OC-117 schema.
3. **Juno (OC-119)**: bind Reports tab to the endpoint contract above.
4. **Quinn (OC-120)**: execute reconciliation matrix and attach evidence.
5. **Elias (OC-121)**: align docs/runbook terminology with this contract.
6. **Ada (OC-116 / OC-036)**: final architecture sign-off and close contract drift.

## Immediate blocker watch

- OC-118/119/120 are functionally blocked until OC-117 migration + ingestion path is merged and available in the working branch.
- If OC-117 ETA slips >12h, split OC-118 into fixture-backed query prototyping branch to reduce idle time.
