import { STATUSES, OWNERS, PRIORITIES, EFFORTS } from '../constants'

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'updated_at', label: 'Updated date' },
  { value: 'created_at', label: 'Created date' },
  { value: 'status', label: 'Status' },
  { value: 'owner', label: 'Owner' },
  { value: 'estimated_token_effort', label: 'Effort' },
]

/**
 * Filter row for the kanban/task list. Holds status, owner, priority, effort, search inputs, and sort controls.
 */
export default function FilterBar({ filters, onChange, onClear, sortField, sortDirection, onSortChange }) {
  const set = (key, val) => {
    const updated = { ...filters, [key]: val }
    if (key === 'status') updated.excludeDone = false
    onChange(updated)
  }

  return (
    <div className="filter-bar row g-2 mb-4 align-items-end">
      <div className="col-12 col-md-3">
        <label className="form-label form-label-sm mb-1">Search</label>
        <input
          type="search"
          className="form-control"
          placeholder="Search…"
          value={filters.search || ''}
          onChange={e => set('search', e.target.value)}
        />
      </div>
      <div className="col-6 col-sm-3 col-md-2">
        <label className="form-label form-label-sm mb-1">Status</label>
        <select className="form-select" value={filters.status || ''} onChange={e => set('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="col-6 col-sm-3 col-md-2">
        <label className="form-label form-label-sm mb-1">Owner</label>
        <select className="form-select" value={filters.owner || ''} onChange={e => set('owner', e.target.value)}>
          <option value="">All owners</option>
          {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="col-6 col-sm-3 col-md-2">
        <label className="form-label form-label-sm mb-1">Priority</label>
        <select className="form-select" value={filters.priority || ''} onChange={e => set('priority', e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="col-6 col-sm-3 col-md-1">
        <label className="form-label form-label-sm mb-1">Effort</label>
        <select className="form-select" value={filters.effort || ''} onChange={e => set('effort', e.target.value)}>
          <option value="">All</option>
          {EFFORTS.map(e => <option key={e} value={e}>{e === 'unknown' ? '? Unknown' : `⚡ ${e}`}</option>)}
        </select>
      </div>
      <div className="col-6 col-sm-4 col-md-2">
        <label className="form-label form-label-sm mb-1">Sort by</label>
        <select
          className="form-select"
          value={sortField}
          onChange={e => onSortChange({ field: e.target.value, direction: sortDirection })}
          aria-label="Sort tasks by field"
        >
          {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div className="col-6 col-sm-2 col-md-1">
        <label className="form-label form-label-sm mb-1">Direction</label>
        <button
          className="btn btn-outline-secondary w-100"
          onClick={() => onSortChange({ field: sortField, direction: sortDirection === 'asc' ? 'desc' : 'asc' })}
          aria-label={`Sort direction: ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
          title={`Sort direction: ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>
      <div className="col-12 col-sm-6 col-md-1">
        <button className="btn btn-outline-secondary w-100" onClick={onClear}>Clear</button>
      </div>
    </div>
  )
}
