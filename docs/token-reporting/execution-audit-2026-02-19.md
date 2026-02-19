# OC-036 Execution Audit — 2026-02-19

## Actions taken now

1. Added executable validation script: `scripts/validate-token-report.js`
2. Added npm command: `npm run test:reports`
3. Ran report endpoint checks against a local server instance from current repo code (`PORT=3431`).
4. Probed currently-running dashboard at `http://localhost:3420` for parity.

## Validation evidence

### Local code validation (PASS)
Command:

```bash
DASHBOARD_BASE_URL=http://localhost:3431 DASHBOARD_API_KEY=<key> npm run test:reports
```

Checks passed:
- `window=30` returns required payload keys
- `window=7&include_unlinked=false` filter behavior
- custom `start/end` window handling
- invalid `window=14` returns 400

### Runtime parity probe on live dashboard (BLOCKER)
Probe to `http://localhost:3420/api/reports/tokens?window=30` returned SPA HTML, not JSON API payload.

Interpretation:
- The running dashboard instance is not serving `/api/reports/tokens` (likely older build/process), OR request routing is landing on front-end-only service.

## Immediate unblock recommendation

Owner: **Atlas (ops)**

1. Verify active process and source directory for port 3420.
2. Restart dashboard from latest `openclaw-dashboard` workspace state.
3. Re-run `npm run test:reports` against `http://localhost:3420`.
4. Post deploy hash + command evidence in OC-118 and OC-036 comments.

## Notes

This turns OC-036 subtasks from speculative status into measurable checks and a repeatable command gate for future regressions.
