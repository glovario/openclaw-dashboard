import { STATUS_COLORS, STATUS_META, PRIORITY_ICONS, OWNERS } from '../constants'
import TaskForm from './TaskForm'
import EffortBadge from './EffortBadge'
import { useState, useEffect } from 'react'
import { fetchComments, addComment, fetchTaskHistory } from '../api'

/**
 * Modal that exposes task metadata, comments, history, and quick status controls.
 * @param {{task:Object, onClose:function, onSave:function, onDelete:function}} props
 */
export default function TaskDetailModal({ task, onClose, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [comments, setComments] = useState([])
  const [history, setHistory] = useState([])
  const [historyError, setHistoryError] = useState('')
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [commentAuthor, setCommentAuthor] = useState(OWNERS[0])
  const [commentBody, setCommentBody] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  useEffect(() => {
    if (!task) return
    fetchComments(task.id).then(setComments).catch(() => {})
    setHistoryError('')
    setHistoryExpanded(false)
    fetchTaskHistory(task.id)
      .then(setHistory)
      .catch(err => setHistoryError(err.message || 'Failed to load history'))
  }, [task?.id])

  if (!task) return null

  const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : []

  const handleSave = async form => {
    await onSave(task.id, form)
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return
    setDeleting(true)
    try { await onDelete(task.id) } finally { setDeleting(false) }
  }

  const handleAddComment = async e => {
    e.preventDefault()
    if (!commentBody.trim()) return
    setCommentSubmitting(true)
    try {
      const comment = await addComment(task.id, { author: commentAuthor, body: commentBody.trim() })
      setComments(prev => [...prev, comment])
      setCommentBody('')
    } catch (err) {
      alert('Failed to add comment: ' + err.message)
    } finally {
      setCommentSubmitting(false)
    }
  }

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">

          {/* Header */}
          <div className="modal-header border-bottom-0 pb-0">
            <div className="flex-grow-1 me-3">
              {editing ? (
                <h5 className="modal-title mb-0">Edit Task</h5>
              ) : (
                <>
                  {task.display_id && (
                    <div className="text-muted mb-1" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {task.display_id}
                    </div>
                  )}
                  <h5 className="modal-title mb-0 fw-bold" style={{ lineHeight: 1.3 }}>
                    {task.title}
                  </h5>
                </>
              )}
            </div>
            <button type="button" className="btn-close ms-2 flex-shrink-0" onClick={onClose} />
          </div>

          <div className="modal-body pt-3">
            {editing ? (
              <TaskForm task={task} onSave={handleSave} onCancel={() => setEditing(false)} />
            ) : (
              <div>
                {/* Meta row */}
                <div className="task-detail-meta d-flex flex-wrap align-items-center gap-2 mb-4">
                  <span className={`badge bg-${STATUS_COLORS[task.status] || 'secondary'} fs-xs`}>
                    {STATUS_META[task.status]?.label || task.status}
                  </span>
                  <span className={`badge owner-badge owner-${task.owner}`}>{task.owner}</span>
                  <span className="small" title={`Priority: ${task.priority}`}>
                    {PRIORITY_ICONS[task.priority]}{' '}
                    <span className="text-muted">{task.priority}</span>
                  </span>
                  <EffortBadge effort={task.estimated_token_effort} compact={false} />
                </div>

                {/* Description */}
                {task.description && (
                  <div className="mb-4 form-section">
                    <div className="modal-section-label">Description</div>
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {task.description}
                    </p>
                  </div>
                )}

                {/* GitHub */}
                {task.github_url && (
                  <div className="mb-4 form-section">
                    <div className="modal-section-label">GitHub</div>
                    <a href={task.github_url} target="_blank" rel="noopener noreferrer"
                       className="text-break small d-flex align-items-center gap-1">
                      <span>🔗</span> {task.github_url}
                    </a>
                  </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="mb-4 form-section">
                    <div className="modal-section-label">Tags</div>
                    <div className="d-flex flex-wrap gap-1">
                      {tags.map(t => (
                        <span key={t} className="badge rounded-pill bg-light text-dark border">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-muted small mb-4 d-flex flex-wrap gap-3">
                  <span>📅 Created: {new Date(task.created_at).toLocaleString()}</span>
                  <span>✏️ Updated: {new Date(task.updated_at).toLocaleString()}</span>
                  {task.created_by && <span>👤 Created by: {task.created_by}</span>}
                </div>

                {/* Quick status change */}
                <div className="mb-4 form-section">
                  <div className="modal-section-label">Quick Status Change</div>
                  <div className="d-flex flex-wrap gap-1">
                    {Object.entries(STATUS_META).map(([s, meta]) => (
                      <button
                        key={s}
                        type="button"
                        className={`btn btn-sm btn-${task.status === s ? meta.color : 'outline-' + meta.color} ${task.status === s ? meta.textClass : ''}`}
                        onClick={() => onSave(task.id, { status: s })}
                      >
                        {meta.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comments */}
                <div className="mb-4 form-section">
                  <div className="modal-section-label">
                    Comments
                    {comments.length > 0 && (
                      <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }}>
                        {comments.length}
                      </span>
                    )}
                  </div>

                  {comments.length === 0 ? (
                    <p className="text-muted small fst-italic mb-3">No comments yet.</p>
                  ) : (
                    <div className="d-flex flex-column gap-2 mb-3">
                      {comments.map(c => (
                        <div key={c.id} className="comment-card">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className={`badge owner-badge owner-${c.author}`}>{c.author}</span>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {new Date(c.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {c.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleAddComment} className="bg-light rounded p-3">
                    <div className="d-flex gap-2 mb-2 align-items-center">
                      <label className="small fw-semibold text-muted flex-shrink-0">As:</label>
                      <select
                        className="form-select form-select-sm"
                        style={{ maxWidth: '150px' }}
                        value={commentAuthor}
                        onChange={e => setCommentAuthor(e.target.value)}
                      >
                        {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <textarea
                      className="form-control form-control-sm mb-2"
                      rows={2}
                      placeholder="Add a comment…"
                      value={commentBody}
                      onChange={e => setCommentBody(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary"
                      disabled={commentSubmitting || !commentBody.trim()}
                    >
                      {commentSubmitting ? 'Posting…' : 'Post Comment'}
                    </button>
                  </form>
                </div>

                {/* History */}
                <div className="form-section">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="modal-section-label mb-0">
                      History
                      {history.length > 0 && (
                        <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }}>
                          {history.length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setHistoryExpanded(prev => !prev)}
                    >
                      {historyExpanded ? 'Hide history' : 'Show history'}
                    </button>
                  </div>

                  {historyExpanded && (
                    historyError ? (
                      <p className="text-danger small mb-2">{historyError}</p>
                    ) : history.length === 0 ? (
                      <p className="text-muted small fst-italic mb-2">No recorded field changes yet.</p>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {history.map(h => {
                          const authorLabel = h.author || 'unknown'
                          const authorClass = String(authorLabel).toLowerCase()
                          return (
                            <div key={h.id} className="comment-card">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className={`badge owner-badge owner-${authorClass}`}>
                                  {authorLabel}
                                </span>
                                <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                  {new Date(h.changed_at || h.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                <strong>{h.field_name || 'field'}</strong> changed from{' '}
                                <code>{h.old_value ?? '(empty)'}</code> to <code>{h.new_value ?? '(empty)'}</code>
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!editing && (
            <div className="modal-footer border-top pt-3">
              <button
                className="btn btn-outline-danger btn-sm me-auto"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : '🗑 Delete'}
              </button>
              <button className="btn btn-outline-secondary" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                ✏️ Edit
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
