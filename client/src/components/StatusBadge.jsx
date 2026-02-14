import React from 'react';

const LABELS = {
  'backlog':     'Backlog',
  'in-progress': 'In Progress',
  'review':      'Review',
  'done':        'Done',
};

export default function StatusBadge({ status, className = '' }) {
  const cls = `status-${status}`;
  return (
    <span className={`badge ${cls} ${className}`}>
      {LABELS[status] || status}
    </span>
  );
}
