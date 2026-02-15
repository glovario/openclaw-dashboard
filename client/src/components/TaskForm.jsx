import { useState, useEffect } from 'react'
import { STATUSES, OWNERS, PRIORITIES, EFFORTS, EFFORT_META } from '../constants'

const DEFAULTS = {
  title: '', description: '', status: 'backlog',
  owner: 'matt', priority: 'medium',
  estimated_token_effort: 'unknown',
  github_url: '', tags: ''
}

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
    if (!form.title.trim())              { setError('Title is required'); return }
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
      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

      <div className="mb-3">
        <label className="form-label fw-semibold">Title *</label>
        <input
          className="form-control"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Task title"
          required
          autoFocus
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Description</label>
        <textarea
          className="form-control"
          rows={3}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Optional description…"
        />
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-4">
          <label className="form-label fw-semibold">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-sm-4">
          <label className="form-label fw-semibold">Owner</label>
          <select className="form-select" value={form.owner} onChange={e => set('owner', e.target.value)}>
            {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="col-sm-4">
          <label className="form-label fw-semibold">Priority</label>
          <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">
          Token Effort{' '}
          <span className="text-muted fw-normal small">— how many tokens will this take?</span>
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

      <div className="mb-3">
        <label className="form-label fw-semibold">GitHub URL</label>
        <input
          className="form-control"
          type="url"
          value={form.github_url}
          onChange={e => set('github_url', e.target.value)}
          placeholder="https://github.com/org/repo/issues/1"
        />
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold">
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

      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  )
}
