import React, { useState, useEffect, useRef } from 'react';
import { OWNERS } from '../constants';

const EMPTY = {
  title: '', description: '', status: 'backlog', owner: 'matt',
  priority: 'medium', github_url: '', tags: '',
};

/**
 * Legacy modal used by the kanban list to create or edit tasks inline.
 * @param {{task:Object|null, onSave:function, onDelete:function, onClose:function}} props
 */
export default function TaskModal({ task, onSave, onDelete, onClose }) {
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const titleRef = useRef(null);
  const isEdit = !!task?.id;

  useEffect(() => {
    setForm(task ? { ...EMPTY, ...task } : EMPTY);
    setError(null);
    setTimeout(() => titleRef.current?.focus(), 80);
  }, [task]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    setSaving(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className={`bi ${isEdit ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`} />
              {isEdit ? 'Edit Task' : 'New Task'}
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger py-2 mb-3">
                  <i className="bi bi-exclamation-triangle me-2" />{error}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label fw-semibold">Title *</label>
                <input
                  ref={titleRef}
                  type="text"
                  className="form-control"
                  placeholder="What needs doing?"
                  value={form.title}
                  onChange={set('title')}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Details, context, links…"
                  value={form.description}
                  onChange={set('description')}
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-4">
                  <label className="form-label fw-semibold">Status</label>
                  <select className="form-select" value={form.status} onChange={set('status')}>
                    <option value="new">New</option>
                    <option value="backlog">Backlog</option>
                    <option value="scope-and-design">Scope &amp; Design</option>
                    <option value="in-progress">In Progress</option>
                    <option value="on-hold">On Hold</option>
                    <option value="for-approval">For Approval</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="col-4">
                  <label className="form-label fw-semibold">Owner</label>
                  <select className="form-select" value={form.owner} onChange={set('owner')}>
                    {[...OWNERS].sort((a, b) => a.localeCompare(b)).map(owner => (
                      <option key={owner} value={owner}>
                        {owner.charAt(0).toUpperCase() + owner.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-4">
                  <label className="form-label fw-semibold">Priority</label>
                  <select className="form-select" value={form.priority} onChange={set('priority')}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-github me-1" />GitHub URL
                </label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://github.com/glovario/…"
                  value={form.github_url}
                  onChange={set('github_url')}
                />
              </div>

              <div className="mb-2">
                <label className="form-label fw-semibold">
                  Tags <span className="text-secondary fw-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. api, frontend, urgent"
                  value={form.tags}
                  onChange={set('tags')}
                />
              </div>
            </div>

            <div className="modal-footer d-flex">
              {isEdit && (
                <button
                  type="button"
                  className="btn btn-outline-danger me-auto"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <i className="bi bi-trash me-1" />Delete
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                  : <><i className="bi bi-check-lg me-1" />{isEdit ? 'Save Changes' : 'Create Task'}</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
