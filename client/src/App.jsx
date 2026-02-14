import React, { useState, useCallback, useEffect } from 'react';
import { useTasks } from './hooks/useTasks';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import FilterBar from './components/FilterBar';
import StatsBar from './components/StatsBar';

const EMPTY_FILTERS = { status: '', owner: '', priority: '', search: '' };

export default function App() {
  const [filters, setFilters]       = useState(EMPTY_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState(EMPTY_FILTERS);
  const [modalTask, setModalTask]   = useState(null);  // null=closed, {}=new, {...}=edit
  const [modalOpen, setModalOpen]   = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters(filters), 260);
    return () => clearTimeout(t);
  }, [filters]);

  const { tasks, loading, error, createTask, updateTask, deleteTask } =
    useTasks(debouncedFilters);

  const openNew  = () => { setModalTask(null); setModalOpen(true); };
  const openEdit = (task) => { setModalTask(task); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleSave = useCallback(async (form) => {
    const { id, created_at, updated_at, ...body } = form;
    if (modalTask?.id) {
      await updateTask(modalTask.id, body);
    } else {
      await createTask(body);
    }
  }, [modalTask, createTask, updateTask]);

  const handleDelete = useCallback(async (id) => {
    await deleteTask(id);
  }, [deleteTask]);

  // Keyboard shortcut: N = new task (when modal is closed)
  useEffect(() => {
    const handler = (e) => {
      if (modalOpen) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'n' || e.key === 'N') openNew();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [modalOpen]);

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* ── Navbar ── */}
      <nav className="navbar navbar-dark sticky-top">
        <div className="container-fluid px-3">
          <span className="navbar-brand fw-bold mb-0">
            🐾 OpenClaw Dashboard
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={openNew}
            title="New task (N)"
          >
            <i className="bi bi-plus-lg me-1" />
            New Task
          </button>
        </div>
      </nav>

      {/* ── Filters ── */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* ── Stats bar ── */}
      {!loading && !error && <StatsBar tasks={tasks} />}

      {/* ── Main ── */}
      <main className="flex-grow-1 container-fluid px-3 py-3" style={{ maxWidth: 860 }}>
        {loading && (
          <div className="text-center py-5 text-secondary">
            <div className="spinner-border mb-3" />
            <p>Loading tasks…</p>
          </div>
        )}

        {error && (
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle me-2" />
            {error}
          </div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div className="text-center py-5 text-secondary">
            <div className="empty-icon mb-3">📋</div>
            <p className="mb-3">No tasks found</p>
            <button className="btn btn-outline-primary" onClick={openNew}>
              <i className="bi bi-plus-lg me-1" />Create first task
            </button>
          </div>
        )}

        {!loading && !error && tasks.map(task => (
          <TaskCard key={task.id} task={task} onClick={openEdit} />
        ))}
      </main>

      {/* ── Modal ── */}
      {modalOpen && (
        <TaskModal
          task={modalTask}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
