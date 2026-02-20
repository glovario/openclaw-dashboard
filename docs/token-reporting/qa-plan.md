# OC-036.5 QA Reconciliation + Regression Plan

## Scope
Validate token reporting correctness and edge-case behavior for `/api/reports/tokens`.

## Test matrix
1. **Totals reconciliation**
   - Seed linked + unlinked events.
   - Assert totals equal sum(by_task) when include_unlinked=true.
2. **Linked/unlinked split**
   - Assert `linked_events + unlinked_events == event_count`.
3. **Window filters**
   - Validate 7/30/90 include expected rows only.
4. **Custom range**
   - Validate `start/end` exact boundaries.
5. **Empty windows**
   - Returns 200 + zero totals + empty arrays.
6. **Sorting**
   - by_agent/by_task/by_model ordered by cost then tokens.
7. **UI regression hooks**
   - Ensure response keys stable for cards/charts/tables.
8. **Ingestion idempotency**
   - POST duplicate `event_uid` payload twice and verify second call returns deduped count without adding rows.

## Automated contract regression (execution-run 2026-02-20)
- Command: `npm run test:reports-contract`
- Coverage now automated:
  - ingestion endpoint write + dedupe behavior
  - include_unlinked true/false totals reconciliation sanity
  - custom `start/end` window path (`window=custom`) with deterministic totals
  - stable response arrays (`by_agent`, `by_task`, `by_model`, `trend`)
  - invalid window rejection (`400`)
- Current result: ✅ passing on local execution fixture DB (re-run 2026-02-20 05:19 Europe/London).

## Automated SQL↔API reconciliation (execution-run 2026-02-20 06:09)
- Command: `npm run test:reports-reconciliation`
- Coverage now automated:
  - API totals vs direct SQL totals (`events`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `cost_usd`)
  - include_unlinked=true/false reconciliation checks
  - aggregate consistency (`sum(by_agent/by_task/by_model.total_tokens) == totals.total_tokens`)
- Current result: ✅ passing on isolated fixture DB (re-run 2026-02-20 06:09 Europe/London).

## Sign-off evidence expected
- API response snapshots for each matrix case
- SQL cross-check query outputs
- Pass/fail summary and defects (if any)
