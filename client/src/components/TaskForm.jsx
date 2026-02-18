import { useState, useEffect } from 'react'
import { STATUSES, OWNERS, PRIORITIES, EFFORTS, EFFORT_META, STATUS_META } from '../constants'

const DEFAULTS = {
  title: '', description: '', status: 'new',
  owner: 'matt', priority: 'medium',
  estimated_token_effort: 'unknown',
  github_url: '', tags: ''
}

/**
 * Controlled form for creating or editing a task record (used in modals).
 * @param {{task:Object|null, onSave:function, onCancel:function}} props
 */
export default function TaskForm({ task, onSave, onCancel }) {
  const [form, setForm] = useState(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setForm(task ? { ...DEFAULTS, ...task } : DEFAULTS)
    setError(null)
  }, [task])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const isEdit = Boolean(task?.id)

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="alert alert-danger py-2 mb-4">{error}</div>}

      {/* Title & Description */}
      <div className="mb-3">
        <label className="form-label fw-semibold">
          Title <span className="text-danger">*</span>
        </label>
        <input
          className="form-control form-control-lg"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="What needs to be done?"
          required
          autoFocus
          style={{ fontSize: '1rem' }}
        />
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold">Description</label>
        <textarea
          className="form-control"
          rows={4}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Add more detail, context, or acceptance criteria…"
        />
      </div>

      {/* Core attributes — 3-column grid */}
      <div className="p-3 rounded mb-4" style={{ background: 'var(--color-surface)' }}>
        <div className="modal-section-label mb-3">Task Attributes</div>
        <div className="row g-3">
          <div className="col-sm-4">
            <label className="form-label fw-semibold small">Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
              ))}
            </select>
          </div>
          <div className="col-sm-4">
            <label className="form-label fw-semibold small">Owner</label>
            <select
              className="form-select"
              value={form.owner}
              onChange={e => set('owner', e.target.value)}
            >
              {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="col-sm-4">
            <label className="form-label fw-semibold small">Priority</label>
            <select
              className="form-select"
              value={form.priority}
              onChange={e => set('priority', e.target.value)}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Token Effort */}
      <div className="mb-4">
        <label className="form-label fw-semibold">
          Token Effort{' '}
          <span className="text-muted fw-normal small">— estimated complexity</span>
        </label>
        <div className="d-flex gap-2 flex-wrap">
          {EFFORTS.map(e => {
            const meta = EFFORT_META[e]
            const selected = form.estimated_token_effort === e
            return (
              <button
                key={e}
                type="button"
                className={`btn btn-${selected ? meta.color : 'outline-' + meta.color} ${meta.color === 'warning' && selected ? 'text-dark' : ''}`}
                onClick={() => set('estimated_token_effort', e)}
                title={meta.title}
              >
                {e === 'unknown' ? '? Unknown' : `⚡ ${e.charAt(0).toUpperCase() + e.slice(1)}`}
                {e !== 'unknown' && (
                  <span className="d-none d-sm-inline text-opacity-75 ms-1" style={{ fontSize: '0.75em' }}>
                    {e === 'small' ? '(<2k)' : e === 'medium' ? '(2k–8k)' : '(8k+)'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* GitHub & Tags */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <label className="form-label fw-semibold small">GitHub URL</label>
          <input
            className="form-control"
            type="url"
            value={form.github_url}
            onChange={e => set('github_url', e.target.value)}
            placeholder="https://github.com/org/repo/pull/1"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold small">
            Tags{' '}
            <span className="text-muted fw-normal">(comma-separated)</span>
          </label>
          <input
            className="form-control"
            value={form.tags}
            onChange={e => set('tags', e.target.value)}
            placeholder="frontend, api, bug"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="d-flex gap-2 justify-content-end pt-2 border-top">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary px-4" disabled={saving}>
          {saving ? (
            <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
          ) : isEdit ? 'Save Changes' : 'Create Task'}
        </button>
      </div>
    </form>
  )
}
