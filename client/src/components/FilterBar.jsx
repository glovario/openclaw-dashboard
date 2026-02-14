import React from 'react';

export default function FilterBar({ filters, onChange }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="filter-bar d-flex gap-2 py-2 px-3 border-bottom border-secondary-subtle">
      <div className="input-group input-group-sm" style={{ minWidth: 180, maxWidth: 320 }}>
        <span className="input-group-text">
          <i className="bi bi-search" />
        </span>
        <input
          type="search"
          className="form-control"
          placeholder="Search tasks…"
          value={filters.search}
          onChange={set('search')}
          autoComplete="off"
        />
      </div>

      <select
        className="form-select form-select-sm"
        style={{ minWidth: 130 }}
        value={filters.status}
        onChange={set('status')}
      >
        <option value="">All status</option>
        <option value="backlog">Backlog</option>
        <option value="in-progress">In Progress</option>
        <option value="review">Review</option>
        <option value="done">Done</option>
      </select>

      <select
        className="form-select form-select-sm"
        style={{ minWidth: 130 }}
        value={filters.owner}
        onChange={set('owner')}
      >
        <option value="">All owners</option>
        <option value="matt">Matt</option>
        <option value="norman">Norman</option>
        <option value="ada">Ada</option>
        <option value="mason">Mason</option>
        <option value="atlas">Atlas</option>
        <option value="bard">Bard</option>
        <option value="team">Team</option>
      </select>

      <select
        className="form-select form-select-sm"
        style={{ minWidth: 120 }}
        value={filters.priority}
        onChange={set('priority')}
      >
        <option value="">All priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
  );
}
