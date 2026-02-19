import { STATUS_COLORS, STATUS_META, PRIORITY_ICONS } from '../constants'
import EffortBadge from './EffortBadge'

/**
 * Clickable card summarizing a task for the kanban board.
 * @param {{task:Object, onClick:function}} props
 */
export default function TaskCard({ task, onClick }) {
  const tags = typeof task.tags === 'string'
    ? task.tags.split(',').map(t => t.trim()).filter(Boolean)
    : []
  const unresolvedBlockerCount = Number(task.unresolved_blocker_count || 0)
  const isBlocked = unresolvedBlockerCount > 0 || Number(task.is_blocked) === 1 || task.is_blocked === true

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
          {/*
            OC-023 FIX (recurring — do NOT remove these overflow styles):
            In flex layouts, text truncation only works when ALL ancestor flex children
            have minWidth:0 and overflow:hidden. Without this, text overflows the card.
            This has been fixed and lost in merges multiple times. Please keep it.
          */}
          <div className="flex-grow-1" style={{ minWidth: 0, overflow: 'hidden' }}>
            {/* OC-023: minWidth:0 + overflow:hidden on this row enables h6 ellipsis below */}
            <div className="d-flex align-items-center gap-2 mb-1" style={{ minWidth: 0, overflow: 'hidden' }}>
              {task.display_id && (
                <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#6c757d', letterSpacing: '0.02em', userSelect: 'none', flexShrink: 0 }}>
                  {task.display_id}
                </span>
              )}
              {/* OC-023: overflow+ellipsis+nowrap+minWidth:0 required for title truncation */}
              <h6
                className="card-title mb-0"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
              >{task.title}</h6>
            </div>
            {/* OC-023: webkit line-clamp clamps description to 2 lines */}
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
              <span
                className={`badge owner-badge owner-${task.owner}`}
                title={Number(task.owner_active) === 1 ? 'Owner binding active' : 'Owner binding not active'}
              >
                {task.owner} {Number(task.owner_active) === 1 ? '🟢' : '⚪'}
              </span>
              <span className="text-muted small" title={`Priority: ${task.priority}`}>
                {PRIORITY_ICONS[task.priority]}
              </span>
              <EffortBadge effort={task.estimated_token_effort} compact />
              {isBlocked && (
                <span
                  className="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle"
                  title={unresolvedBlockerCount > 0
                    ? `Blocked by ${unresolvedBlockerCount} unresolved dependenc${unresolvedBlockerCount === 1 ? 'y' : 'ies'}`
                    : 'Blocked by unresolved dependency'}
                >
                  ⛔ {unresolvedBlockerCount > 0 ? unresolvedBlockerCount : 'Blocked'}
                </span>
              )}
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
