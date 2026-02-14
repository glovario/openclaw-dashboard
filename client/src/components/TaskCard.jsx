import React from 'react';
import StatusBadge from './StatusBadge';
import OwnerBadge from './OwnerBadge';

export default function TaskCard({ task, onClick }) {
  const tags = task.tags
    ? task.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <div
      className="card task-card bg-card mb-3"
      onClick={() => onClick(task)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(task)}
    >
      <div className="card-body py-3 px-3">
        {/* Header row */}
        <div className="d-flex align-items-start gap-2 mb-2">
          <span
            className={`priority-dot priority-dot ${task.priority} mt-1`}
            title={`Priority: ${task.priority}`}
          />
          <h6 className={`card-title mb-0 flex-grow-1 ${task.status === 'done' ? 'done-text' : ''}`}>
            {task.title}
          </h6>
        </div>

        {/* Badges */}
        <div className="d-flex flex-wrap gap-1 mb-2">
          <StatusBadge status={task.status} />
          <OwnerBadge owner={task.owner} />
          <span className={`badge bg-secondary`}>
            <i className={`bi bi-arrow-up-circle${task.priority === 'high' ? '-fill' : ''} me-1`} />
            {task.priority}
          </span>
        </div>

        {/* Description */}
        {task.description && (
          <p className="task-desc mb-2">{task.description}</p>
        )}

        {/* Tags + GitHub */}
        {(tags.length > 0 || task.github_url) && (
          <div className="d-flex flex-wrap gap-1 align-items-center">
            {tags.map(tag => (
              <span key={tag} className="tag-pill">{tag}</span>
            ))}
            {task.github_url && (
              <a
                href={task.github_url}
                className="tag-pill text-decoration-none"
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
              >
                <i className="bi bi-github me-1" />
                GitHub
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
