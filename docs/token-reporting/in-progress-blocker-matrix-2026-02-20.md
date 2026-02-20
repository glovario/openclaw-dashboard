# OC-036 In-Progress Blocker Matrix (2026-02-20 01:19 Europe/London)

Reference branch: `chore/oc-036-142-execution-pass-2026-02-20`  
Reference PR: https://github.com/glovario/openclaw-dashboard/pull/52

## Concrete actions completed in this run
- Re-ran token reporting contract validator: pass on all contract checks; data volume still zero.
- Reconfirmed OC-036 dependency topology from live dashboard API.
- Recorded unblock owner + next-step per active task.

## Per-task unblock map

| Task | State | Advancement action now | Blocker owner | Next unblock step | ETA |
|---|---|---|---|---|---|
| OC-116 (Ada) | in-progress | Contract/addendum remains published and referenced for downstream work | Ada | Mark contract as locked-in comment + handoff to Mason/Malik | 0.5d |
| OC-117 (Mason) | in-progress/blocked | Validator evidence updated to show schema accepts zero data cleanly | Mason | Wire ingestion writes into `token_usage_events` and seed one non-zero sample event | 1d |
| OC-118 (Malik) | in-progress/blocked | Endpoint contract pass reconfirmed (shape stable) | Malik + Mason | Complete aggregation logic over real ingested rows and verify grouped summaries | 1d |
| OC-119 (Juno) | in-progress/blocked | UI can proceed on empty-state contract; evidence captured | Juno + Malik | Bind Reports tab to live endpoint once OC-118 returns non-empty payloads | 1d after OC-118 |
| OC-120 (Quinn) | in-progress/blocked | QA script rerun proves empty-window contract path is stable | Quinn + Mason | Execute reconciliation suite once non-zero fixtures/events exist | same day as data availability |
| OC-121 (Elias) | in-progress/blocked | Runbook/spec references refreshed | Elias + Malik | Finalize docs with concrete non-zero examples from OC-118 output | 0.5d after OC-118 |
| OC-036 (parent) | in-progress/blocked | Parent dependency map refreshed and communicated in task comments | Norman (orchestration) | Close children in dependency order; then move parent to for-approval | after children |

## Notes
- Current technical risk is not schema/API shape; it is missing non-zero ingestion data for reconciliation-level QA and narrative docs.
- Recommendation: prioritize OC-117 ingestion event generation first, then immediately rerun OC-118/120/121 validation in one pass.
