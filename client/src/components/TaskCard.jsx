import { STATUS_COLORS, PRIORITY_ICONS } from '../constants'

export default function TaskCard({ task, onClick }) {
  const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : []

  return (
    <div
      className={`card task-card mb-3 priority-${task.priority}`}
      onClick={() => onClick(task)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(task)}
    >
      <div className="card-body py-3">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div className="flex-grow-1 min-w-0">
            <h6 className="card-title mb-1 text-truncate">{task.title}</h6>
            {task.description && (
              <p className="card-text text-muted small mb-2 text-truncate">{task.description}</p>
            )}
            <div className="d-flex flex-wrap gap-1 align-items-center">
              <span className={`badge status-badge bg-${STATUS_COLORS[task.status] || 'secondary'}`}>
                {task.status}
              </span>
              <span className={`badge owner-badge owner-${task.owner}`}>
                {task.owner}
              </span>
              <span className="text-muted small" title={`Priority: ${task.priority}`}>
                {PRIORITY_ICONS[task.priority]}
              </span>
              {tags.map(tag => (
                <span key={tag} className="badge rounded-pill bg-light text-dark border tag-pill">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
