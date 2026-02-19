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

## Sign-off evidence expected
- API response snapshots for each matrix case
- SQL cross-check query outputs
- Pass/fail summary and defects (if any)
