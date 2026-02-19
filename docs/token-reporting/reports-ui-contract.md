# OC-036.4 Reports UI Contract Notes

Backend contract now available at `GET /api/reports/tokens` with:
- KPI source: `totals`
- Trend chart source: `trend[]`
- Top agent/task tables: `by_agent[]`, `by_task[]`
- Optional model table: `by_model[]`

Recommended frontend filter mapping:
- `window`: 7/30/90/custom
- custom -> `start` + `end`
- include unlinked toggle -> `include_unlinked`

Empty/error states:
- Empty: show `event_count=0`, no chart points, no table rows
- Error: show API message and retry action
