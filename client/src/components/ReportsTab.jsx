import { useEffect, useMemo, useState } from 'react'
import { fetchTokenReport } from '../api'

function fmtInt(n) { return Number(n || 0).toLocaleString() }
function fmtUsd(n) { return `$${Number(n || 0).toFixed(4)}` }

function dayInputValue(date) {
  return new Date(date).toISOString().slice(0, 10)
}

export default function ReportsTab() {
  const [windowDays, setWindowDays] = useState('30')
  const [includeUnlinked, setIncludeUnlinked] = useState(true)
  const [customStart, setCustomStart] = useState(dayInputValue(Date.now() - (1000 * 60 * 60 * 24 * 30)))
  const [customEnd, setCustomEnd] = useState(dayInputValue(Date.now()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [report, setReport] = useState(null)

  const query = useMemo(() => {
    const base = { include_unlinked: includeUnlinked }
    if (windowDays === 'custom') {
      return {
        ...base,
        window: 'custom',
        start: `${customStart}T00:00:00.000Z`,
        end: `${customEnd}T23:59:59.999Z`
      }
    }
    return { ...base, window: windowDays }
  }, [windowDays, includeUnlinked, customStart, customEnd])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTokenReport(query)
        if (!cancelled) setReport(data)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [query])

  const maxTrendTokens = Math.max(1, ...(report?.trend || []).map((r) => Number(r.total_tokens || 0)))

  return (
    <div>
      <div className="d-flex gap-2 align-items-center flex-wrap mb-3">
        <select className="form-select form-select-sm" style={{ maxWidth: 200 }} value={windowDays} onChange={(e) => setWindowDays(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="custom">Custom range</option>
        </select>

        {windowDays === 'custom' && (
          <>
            <input type="date" className="form-control form-control-sm" style={{ maxWidth: 160 }} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <span className="small text-muted">to</span>
            <input type="date" className="form-control form-control-sm" style={{ maxWidth: 160 }} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </>
        )}

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

          {Number(report.totals?.event_count || 0) === 0 && (
            <div className="alert alert-secondary py-2">No token usage data found for this window.</div>
          )}

          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-2">Trend (daily total tokens)</h6>
              {(report.trend || []).length === 0 ? (
                <div className="small text-muted">No trend points in this window.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {report.trend.map((p) => (
                    <div key={p.day} className="d-flex align-items-center gap-2">
                      <span className="small text-muted" style={{ width: 96 }}>{p.day}</span>
                      <div className="progress flex-grow-1" role="progressbar" aria-label={`Tokens ${p.day}`}>
                        <div className="progress-bar" style={{ width: `${Math.max(4, Math.round((Number(p.total_tokens || 0) / maxTrendTokens) * 100))}%` }} />
                      </div>
                      <span className="small" style={{ width: 96, textAlign: 'right' }}>{fmtInt(p.total_tokens)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <div className="card h-100"><div className="card-body">
                <h6>Top Agents</h6>
                {(report.by_agent || []).length === 0 ? <div className="small text-muted">No agent rows.</div> : (
                  <ul className="list-group list-group-flush">
                    {(report.by_agent || []).slice(0, 8).map((r) => (
                      <li key={r.agent} className="list-group-item d-flex justify-content-between px-0">
                        <span>{r.agent}</span>
                        <span className="text-muted">{fmtUsd(r.cost_usd)} · {fmtInt(r.total_tokens)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div></div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="card h-100"><div className="card-body">
                <h6>Top Tasks</h6>
                {(report.by_task || []).length === 0 ? <div className="small text-muted">No task rows.</div> : (
                  <ul className="list-group list-group-flush">
                    {(report.by_task || []).slice(0, 8).map((r, idx) => (
                      <li key={`${r.task_display_id}-${idx}`} className="list-group-item d-flex justify-content-between px-0">
                        <span>{r.task_display_id}</span>
                        <span className="text-muted">{fmtUsd(r.cost_usd)} · {fmtInt(r.total_tokens)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div></div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="card h-100"><div className="card-body">
                <h6>Top Models</h6>
                {(report.by_model || []).length === 0 ? <div className="small text-muted">No model rows.</div> : (
                  <ul className="list-group list-group-flush">
                    {(report.by_model || []).slice(0, 8).map((r) => (
                      <li key={r.model} className="list-group-item d-flex justify-content-between px-0">
                        <span>{r.model}</span>
                        <span className="text-muted">{fmtUsd(r.cost_usd)} · {fmtInt(r.total_tokens)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
