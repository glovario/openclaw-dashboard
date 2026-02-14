import { STATUSES, OWNERS, PRIORITIES, EFFORTS } from '../constants'

export default function FilterBar({ filters, onChange, onClear }) {
  const set = (key, val) => onChange({ ...filters, [key]: val })

  return (
    <div className="filter-bar row g-2 mb-4">
      <div className="col-12 col-sm-6 col-md-3">
        <input
          type="search"
          className="form-control"
          placeholder="Search…"
          value={filters.search || ''}
          onChange={e => set('search', e.target.value)}
        />
      </div>
      <div className="col-6 col-sm-3 col-md-2">
        <select className="form-select" value={filters.status || ''} onChange={e => set('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="col-6 col-sm-3 col-md-2">
        <select className="form-select" value={filters.owner || ''} onChange={e => set('owner', e.target.value)}>
          <option value="">All owners</option>
          {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="col-6 col-sm-3 col-md-2">
        <select className="form-select" value={filters.priority || ''} onChange={e => set('priority', e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="col-6 col-sm-3 col-md-2">
        <select className="form-select" value={filters.effort || ''} onChange={e => set('effort', e.target.value)}>
          <option value="">All effort</option>
          {EFFORTS.map(e => <option key={e} value={e}>⚡ {e}</option>)}
        </select>
      </div>
      <div className="col-6 col-sm-3 col-md-auto">
        <button className="btn btn-outline-secondary w-100" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  )
}
