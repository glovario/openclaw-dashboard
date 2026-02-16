import { STATUS_COLORS, STATUS_META, PRIORITY_ICONS, OWNERS } from '../constants'
import TaskForm from './TaskForm'
import EffortBadge from './EffortBadge'
import { useState, useEffect } from 'react'
import { fetchComments, addComment, fetchHistory, fetchDependencies, addDependency, removeDependency } from '../api'

export default function TaskDetailModal({ task, onClose, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [comments, setComments] = useState([])
  const [commentAuthor, setCommentAuthor] = useState(OWNERS[0])
  const [commentBody, setCommentBody] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  // OC-032: history
  const [history, setHistory] = useState([])

  // OC-033: dependencies
  const [deps, setDeps] = useState({ blocked_by: [], blocking: [] })
  const [addingDep, setAddingDep] = useState(false)
  const [depInput, setDepInput] = useState('')
  const [depError, setDepError] = useState('')

  useEffect(() => {
    if (!task) return
    fetchComments(task.id).then(setComments).catch(() => {})
    fetchHistory(task.id).then(setHistory).catch(() => {})
    fetchDependencies(task.id).then(d => setDeps({ blocked_by: d.blocked_by || [], blocking: d.blocking || [] })).catch(() => {})
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

  const handleAddDep = async e => {
    e.preventDefault()
    setDepError('')
    const val = depInput.trim()
    if (!val) return
    const numId = /^\d+$/.test(val) ? parseInt(val, 10) : null
    const displayMatch = val.match(/^OC-(\d+)$/i)
    if (!numId && !displayMatch) {
      setDepError('Enter a task ID (number) or display ID (e.g. OC-042)')
      return
    }
    setAddingDep(true)
    try {
      let targetId = numId
      if (!targetId && displayMatch) {
        const res = await fetch('/api/tasks?limit=500', {
          headers: { 'X-API-Key': window.__DASHBOARD_API_KEY__ || '' }
        })
        const data = await res.json()
        const match = data.tasks && data.tasks.find(t => t.display_id && t.display_id.toLowerCase() === val.toLowerCase())
        if (!match) { setDepError(`Task ${val} not found`); setAddingDep(false); return }
        targetId = match.id
      }
      await addDependency(task.id, targetId)
      const d = await fetchDependencies(task.id)
      setDeps({ blocked_by: d.blocked_by || [], blocking: d.blocking || [] })
      setDepInput('')
    } catch (err) {
      setDepError(err.message)
    } finally {
      setAddingDep(false)
    }
  }

  const handleRemoveDep = async (depId) => {
    try {
      await removeDependency(task.id, depId)
      const d = await fetchDependencies(task.id)
      setDeps({ blocked_by: d.blocked_by || [], blocking: d.blocking || [] })
    } catch (err) {
      alert('Failed to remove dependency: ' + err.message)
    }
  }

  const formatHistoryField = (field) => {
    if (field === '_created') return 'Created'
    return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title d-flex align-items-center gap-2">
              {editing ? 'Edit Task' : (
                <>
                  {task.display_id && (
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6c757d', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                      {task.display_id}
                    </span>
                  )}
                  {task.is_blocked ? <span className="badge bg-danger" title="Blocked">🚫</span> : null}
                  {task.title}
                </>
              )}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {editing ? (
              <TaskForm task={task} onSave={handleSave} onCancel={() => setEditing(false)} />
            ) : (
              <div>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className={`badge bg-${STATUS_COLORS[task.status] || 'secondary'}`}>{task.status}</span>
                  <span className={`badge owner-badge owner-${task.owner}`}>{task.owner}</span>
                  <span title={`Priority: ${task.priority}`}>{PRIORITY_ICONS[task.priority]} {task.priority}</span>
                  <EffortBadge effort={task.estimated_token_effort} compact={false} />
                  {task.is_blocked ? <span className="badge bg-danger">🚫 Blocked</span> : null}
                </div>

                {task.description && (
                  <div className="mb-3">
                    <h6 className="text-muted text-uppercase small mb-1">Description</h6>
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>
                  </div>
                )}

                {task.github_url && (
                  <div className="mb-3">
                    <h6 className="text-muted text-uppercase small mb-1">GitHub</h6>
                    <a href={task.github_url} target="_blank" rel="noopener noreferrer" className="text-break">
                      {task.github_url}
                    </a>
                  </div>
                )}

                {tags.length > 0 && (
                  <div className="mb-3">
                    <h6 className="text-muted text-uppercase small mb-1">Tags</h6>
                    <div className="d-flex flex-wrap gap-1">
                      {tags.map(t => (
                        <span key={t} className="badge rounded-pill bg-light text-dark border">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-muted small mt-3">
                  {task.created_by && <div>Created by: <strong>{task.created_by}</strong></div>}
                  <div>Created: {new Date(task.created_at).toLocaleString()}</div>
                  <div>Updated: {new Date(task.updated_at).toLocaleString()}</div>
                </div>

                <div className="mt-3">
                  <h6 className="text-muted text-uppercase small mb-2">Quick status</h6>
                  <div className="btn-group btn-group-sm flex-wrap gap-1" role="group">
                    {Object.entries(STATUS_META).map(([s, meta]) => (
                      <button
                        key={s}
                        type="button"
                        className={`btn btn-${task.status === s ? meta.color : 'outline-' + meta.color} ${task.status === s ? meta.textClass : ''}`}
                        onClick={() => onSave(task.id, { status: s })}
                      >
                        {meta.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* OC-033: Dependencies */}
                <div className="mt-4">
                  <h6 className="text-muted text-uppercase small mb-2">Dependencies</h6>
                  {deps.blocked_by.length > 0 && (
                    <div className="mb-2">
                      <div className="small text-muted mb-1">Blocked by:</div>
                      {deps.blocked_by.map(t => (
                        <div key={t.dep_id} className="d-flex align-items-center gap-2 mb-1">
                          <span className={`badge bg-${STATUS_COLORS[t.status] || 'secondary'}`}>{t.status}</span>
                          <span className="small">
                            {t.display_id && <span className="text-muted me-1" style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{t.display_id}</span>}
                            {t.title}
                          </span>
                          <button
                            className="btn btn-sm btn-outline-danger py-0 px-1 ms-auto"
                            style={{ fontSize: '0.7rem' }}
                            onClick={() => handleRemoveDep(t.dep_id)}
                            title="Remove dependency"
                          >x</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {deps.blocking.length > 0 && (
                    <div className="mb-2">
                      <div className="small text-muted mb-1">Blocking:</div>
                      {deps.blocking.map(t => (
                        <div key={t.dep_id} className="d-flex align-items-center gap-2 mb-1">
                          <span className={`badge bg-${STATUS_COLORS[t.status] || 'secondary'}`}>{t.status}</span>
                          <span className="small">
                            {t.display_id && <span className="text-muted me-1" style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{t.display_id}</span>}
                            {t.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {deps.blocked_by.length === 0 && deps.blocking.length === 0 && (
                    <p className="text-muted small fst-italic">No dependencies.</p>
                  )}
                  <form className="d-flex gap-2 mt-2" onSubmit={handleAddDep}>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Block by task ID or OC-XXX"
                      value={depInput}
                      onChange={e => setDepInput(e.target.value)}
                      style={{ maxWidth: '220px' }}
                    />
                    <button type="submit" className="btn btn-sm btn-outline-secondary" disabled={addingDep}>
                      {addingDep ? '...' : '+ Add'}
                    </button>
                  </form>
                  {depError && <div className="text-danger small mt-1">{depError}</div>}
                </div>

                {/* Comments */}
                <div className="mt-4">
                  <h6 className="text-muted text-uppercase small mb-2">
                    Comments {comments.length > 0 && <span className="badge bg-secondary ms-1">{comments.length}</span>}
                  </h6>
                  {comments.length === 0 ? (
                    <p className="text-muted small fst-italic">No comments yet.</p>
                  ) : (
                    <div className="d-flex flex-column gap-2 mb-3">
                      {comments.map(c => (
                        <div key={c.id} className="border rounded p-2 bg-light">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className={`badge owner-badge owner-${c.author}`}>{c.author}</span>
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {new Date(c.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleAddComment}>
                    <div className="d-flex gap-2 mb-2">
                      <select
                        className="form-select form-select-sm"
                        style={{ maxWidth: '140px' }}
                        value={commentAuthor}
                        onChange={e => setCommentAuthor(e.target.value)}
                      >
                        {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="mb-2">
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        placeholder="Add a comment..."
                        value={commentBody}
                        onChange={e => setCommentBody(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary"
                      disabled={commentSubmitting || !commentBody.trim()}
                    >
                      {commentSubmitting ? 'Posting...' : 'Post Comment'}
                    </button>
                  </form>
                </div>

                {/* OC-032: History timeline */}
                <div className="mt-4">
                  <h6 className="text-muted text-uppercase small mb-2">
                    History {history.length > 0 && <span className="badge bg-secondary ms-1">{history.length}</span>}
                  </h6>
                  {history.length === 0 ? (
                    <p className="text-muted small fst-italic">No history yet.</p>
                  ) : (
                    <div className="d-flex flex-column gap-1">
                      {[...history].reverse().map(h => (
                        <div key={h.id} className="d-flex gap-2 align-items-start" style={{ fontSize: '0.8rem' }}>
                          <span className="text-muted" style={{ minWidth: '130px', fontSize: '0.72rem', paddingTop: '2px' }}>
                            {new Date(h.changed_at).toLocaleString()}
                          </span>
                          <div>
                            <span className={`badge owner-badge owner-${h.changed_by} me-1`}>{h.changed_by}</span>
                            {h.field_name === '_created' ? (
                              <span>created this task</span>
                            ) : (
                              <span>
                                changed <strong>{formatHistoryField(h.field_name)}</strong>
                                {h.old_value != null && (
                                  <span> from <code className="small">{h.old_value}</code></span>
                                )}
                                {h.new_value != null && (
                                  <span> to <code className="small">{h.new_value}</code></span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {!editing && (
            <div className="modal-footer justify-content-between">
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={onClose}>Close</button>
                <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
