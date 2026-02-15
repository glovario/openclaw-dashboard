import { STATUS_COLORS, PRIORITY_ICONS, OWNERS } from '../constants'
import TaskForm from './TaskForm'
import EffortBadge from './EffortBadge'
import { useState, useEffect } from 'react'
import { fetchComments, addComment } from '../api'

export default function TaskDetailModal({ task, onClose, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [comments, setComments] = useState([])
  const [commentAuthor, setCommentAuthor] = useState(OWNERS[0])
  const [commentBody, setCommentBody] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  useEffect(() => {
    if (!task) return
    fetchComments(task.id).then(setComments).catch(() => {})
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
          <div className="modal-header">
            <h5 className="modal-title">
              {editing ? 'Edit Task' : task.title}
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
                  <div>Created: {new Date(task.created_at).toLocaleString()}</div>
                  <div>Updated: {new Date(task.updated_at).toLocaleString()}</div>
                </div>

                {/* Quick status change */}
                <div className="mt-3">
                  <h6 className="text-muted text-uppercase small mb-2">Quick status</h6>
                  <div className="btn-group btn-group-sm flex-wrap gap-1" role="group">
                    {['backlog','in-progress','review','done'].map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`btn btn-${task.status === s ? STATUS_COLORS[s] : 'outline-' + STATUS_COLORS[s]}`}
                        onClick={() => onSave(task.id, { status: s })}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
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
                        placeholder="Add a comment…"
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
                      {commentSubmitting ? 'Posting…' : 'Post Comment'}
                    </button>
                  </form>
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
                {deleting ? 'Deleting…' : 'Delete'}
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
