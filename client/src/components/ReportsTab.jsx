import { useEffect, useState } from 'react'
import { fetchTokenReport } from '../api'

function fmtInt(n) { return Number(n || 0).toLocaleString() }
function fmtUsd(n) { return `$${Number(n || 0).toFixed(4)}` }

export default function ReportsTab() {
  const [windowDays, setWindowDays] = useState('30')
  const [includeUnlinked, setIncludeUnlinked] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [report, setReport] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTokenReport({ window: windowDays, include_unlinked: includeUnlinked })
        if (!cancelled) setReport(data)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [windowDays, includeUnlinked])

  return (
    <div>
      <div className="d-flex gap-2 align-items-center mb-3">
        <select className="form-select form-select-sm" style={{ maxWidth: 180 }} value={windowDays} onChange={(e) => setWindowDays(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <div className="form-check m-0">
          <input id="include-unlinked" className="form-check-input" type="checkbox" checked={includeUnlinked} onChange={(e) => setIncludeUnlinked(e.target.checked)} />
          <label htmlFor="include-unlinked" className="form-check-label small">Include unlinked</label>
        </div>
      </div>

      {loading && <div className="text-muted">Loading token report…</div>}
      {error && <div className="alert alert-danger py-2">Failed to load token report: {error}</div>}

      {!loading && !error && report && (
        <>
          <div className="row g-2 mb-3">
            <div className="col-6 col-md-3"><div className="card"><div className="card-body py-2"><div className="small text-muted">Total Tokens</div><div className="fw-bold">{fmtInt(report.totals?.total_tokens)}</div></div></div></div>
            <div className="col-6 col-md-3"><div className="card"><div className="card-body py-2"><div className="small text-muted">Cost</div><div className="fw-bold">{fmtUsd(report.totals?.cost_usd)}</div></div></div></div>
            <div className="col-6 col-md-3"><div className="card"><div className="card-body py-2"><div className="small text-muted">Events</div><div className="fw-bold">{fmtInt(report.totals?.event_count)}</div></div></div></div>
            <div className="col-6 col-md-3"><div className="card"><div className="card-body py-2"><div className="small text-muted">Unlinked Events</div><div className="fw-bold">{fmtInt(report.totals?.unlinked_events)}</div></div></div></div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="card h-100"><div className="card-body">
                <h6>Top Agents</h6>
                <ul className="list-group list-group-flush">
                  {(report.by_agent || []).slice(0, 8).map((r) => (
                    <li key={r.agent} className="list-group-item d-flex justify-content-between px-0">
                      <span>{r.agent}</span>
                      <span className="text-muted">{fmtUsd(r.cost_usd)} · {fmtInt(r.total_tokens)}</span>
                    </li>
                  ))}
                </ul>
              </div></div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="card h-100"><div className="card-body">
                <h6>Top Tasks</h6>
                <ul className="list-group list-group-flush">
                  {(report.by_task || []).slice(0, 8).map((r, idx) => (
                    <li key={`${r.task_display_id}-${idx}`} className="list-group-item d-flex justify-content-between px-0">
                      <span>{r.task_display_id}</span>
                      <span className="text-muted">{fmtUsd(r.cost_usd)} · {fmtInt(r.total_tokens)}</span>
                    </li>
                  ))}
                </ul>
              </div></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
