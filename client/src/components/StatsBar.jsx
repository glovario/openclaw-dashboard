import React from 'react';

export default function StatsBar({ tasks }) {
  const counts = {
    backlog:      tasks.filter(t => t.status === 'backlog').length,
    'in-progress':tasks.filter(t => t.status === 'in-progress').length,
    review:       tasks.filter(t => t.status === 'review').length,
    done:         tasks.filter(t => t.status === 'done').length,
  };
  const total = tasks.length;

  const items = [
    { label: 'Backlog',      key: 'backlog',      cls: 'status-backlog' },
    { label: 'In Progress',  key: 'in-progress',  cls: 'status-in-progress' },
    { label: 'Review',       key: 'review',        cls: 'status-review' },
    { label: 'Done',         key: 'done',          cls: 'status-done' },
  ];

  return (
    <div className="d-flex gap-2 flex-wrap px-3 py-2 border-bottom border-secondary-subtle small">
      <span className="text-secondary me-2">{total} task{total !== 1 ? 's' : ''}</span>
      {items.map(({ label, key, cls }) => (
        <span key={key} className={`badge ${cls}`}>
          {counts[key]} {label}
        </span>
      ))}
    </div>
  );
}
