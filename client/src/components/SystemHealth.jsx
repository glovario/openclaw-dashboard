import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

function formatUptime(secs) {
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function indicator(pct, warnAt = 70, redAt = 85) {
  if (pct >= redAt) return { color: '#dc3545', label: 'danger' }
  if (pct >= warnAt) return { color: '#ffc107', label: 'warning' }
  return { color: '#198754', label: 'ok' }
}

function Dot({ color, title }) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-block',
        width: 10, height: 10,
        borderRadius: '50%',
        backgroundColor: color,
        marginRight: 4,
        flexShrink: 0,
      }}
    />
  )
}

function StatRow({ label, pct, text, warnAt, redAt }) {
  const ind = indicator(pct, warnAt, redAt)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
      <Dot color={ind.color} title={ind.label} />
      <span style={{ fontSize: '0.75rem', color: '#ccc', minWidth: 50 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: '#444', borderRadius: 2 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: ind.color, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '0.72rem', color: '#aaa', minWidth: 60, textAlign: 'right' }}>{text}</span>
    </div>
  )
}

function ServiceStatus({ label, info }) {
  const color = info?.up ? '#198754' : '#dc3545'
  return (
    <span style={{ fontSize: '0.72rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: 3 }}>
      <Dot color={color} title={info?.up ? 'up' : 'down'} />
      {label}
    </span>
  )
}

export default function SystemHealth() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)

  async function load() {
    try {
      const d = await apiFetch('/api/system/health')
      setData(d)
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  // Compact summary dot for navbar
  const overallColor = !data ? '#6c757d'
    : [
        indicator(data.cpu.pct, 70, 80).label,
        indicator(data.memory.pct, 70, 85).label,
        indicator(data.disk.pct, 80, 90).label,
        data.services.gateway.up ? 'ok' : 'danger',
      ].includes('danger') ? '#dc3545'
    : [
        indicator(data.cpu.pct, 70, 80).label,
        indicator(data.memory.pct, 70, 85).label,
        indicator(data.disk.pct, 80, 90).label,
      ].includes('warning') ? '#ffc107'
    : '#198754'

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          background: 'none',
          border: '1px solid #444',
          borderRadius: 6,
          color: '#ccc',
          cursor: 'pointer',
          padding: '3px 8px',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
        title="System Health"
      >
        <Dot color={overallColor} title="System status" />
        System
      </button>

      {expanded && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            zIndex: 9999,
            background: '#212529',
            border: '1px solid #444',
            borderRadius: 8,
            padding: '12px 14px',
            minWidth: 260,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>🖥️ System Health</span>
            {data && <span style={{ fontSize: '0.68rem', color: '#666' }}>auto-refresh 30s</span>}
          </div>

          {error && <div style={{ fontSize: '0.72rem', color: '#dc3545' }}>⚠ {error}</div>}

          {data && (
            <>
              <StatRow
                label="CPU"
                pct={data.cpu.pct}
                text={`${data.cpu.pct}%`}
                warnAt={70} redAt={80}
              />
              <StatRow
                label="Memory"
                pct={data.memory.pct}
                text={`${data.memory.usedGb}/${data.memory.totalGb} GB`}
                warnAt={70} redAt={85}
              />
              <StatRow
                label="Disk"
                pct={data.disk.pct}
                text={`${data.disk.used}/${data.disk.total} GB`}
                warnAt={80} redAt={90}
              />

              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #333' }}>
                <div style={{ fontSize: '0.72rem', color: '#aaa', marginBottom: 4 }}>
                  ⏱ Uptime: {formatUptime(data.uptime)}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <ServiceStatus label="Gateway" info={data.services.gateway} />
                  <ServiceStatus label="Dashboard" info={data.services.dashboard} />
                </div>
              </div>
            </>
          )}

          {!data && !error && (
            <div style={{ fontSize: '0.72rem', color: '#666' }}>Loading…</div>
          )}
        </div>
      )}
    </div>
  )
}
