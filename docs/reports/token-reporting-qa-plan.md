# OC-120 — Token Reporting QA Reconciliation Plan

## Objective
Validate `/api/reports/tokens` correctness across totals, grouping, filters, and empty/error states.

## Test matrix

1. **Window presets (7/30/90)**
   - Expect non-error response
   - `window` echoes selected preset

2. **Custom date range**
   - With `start` and `end`
   - `window` becomes `custom`

3. **Linked vs unlinked behavior**
   - `include_unlinked=true`: includes null `task_id`
   - `include_unlinked=false`: excludes null `task_id`

4. **Reconciliation invariants**
   - `event_count = linked_events + unlinked_events`
   - `totals.total_tokens = Σ(by_agent.total_tokens)`
   - `totals.total_tokens = Σ(by_model.total_tokens)`

5. **Edge/empty window**
   - Empty result set should return `ok:true` with zero totals and empty arrays

6. **Invalid query**
   - invalid `window` returns `400` + stable message

## Evidence template

- Command:
  - `curl -s 'http://localhost:3420/api/reports/tokens?window=30' -H 'X-API-Key: <key>' | jq`
- Result:
  - pass/fail
  - mismatch details
- Screenshot (UI reports tab):
  - KPI cards
  - trend
  - top agents/tasks

## Exit criteria
- All matrix rows pass
- At least one fixture set containing both linked + unlinked events validated
- Any discrepancy filed as blocker with owner + reproduction steps
