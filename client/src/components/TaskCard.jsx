import { STATUS_COLORS, STATUS_META, PRIORITY_ICONS } from '../constants'
import EffortBadge from './EffortBadge'

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
            <div className="d-flex align-items-center gap-2 mb-1">
              {task.display_id && (
                <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#6c757d', letterSpacing: '0.02em', userSelect: 'none' }}>
                  {task.display_id}
                </span>
              )}
              <h6 className="card-title mb-0 text-truncate">{task.title}</h6>
            </div>
            {task.description && (
              <p
                className="card-text text-muted small mb-2"
                style={{
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                }}
              >{task.description}</p>
            )}
            <div className="d-flex flex-wrap gap-1 align-items-center">
              <span className={`badge status-badge bg-${STATUS_COLORS[task.status] || 'secondary'} ${(STATUS_META[task.status] || {}).textClass || ''}`}>
                {(STATUS_META[task.status] || {}).label || task.status}
              </span>
              <span className={`badge owner-badge owner-${task.owner}`}>
                {task.owner}
              </span>
              <span className="text-muted small" title={`Priority: ${task.priority}`}>
                {PRIORITY_ICONS[task.priority]}
              </span>
              <EffortBadge effort={task.estimated_token_effort} compact />
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
