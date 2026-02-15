import { useState, useEffect, useCallback } from 'react'
import { fetchTasks, createTask, updateTask, deleteTask, getToken, logout } from './api'
import LoginScreen from './components/LoginScreen'
import FilterBar from './components/FilterBar'
import TaskCard from './components/TaskCard'
import KanbanBoard from './components/KanbanBoard'
import TaskDetailModal from './components/TaskDetailModal'
import AddTaskModal from './components/AddTaskModal'
import SystemHealth from './components/SystemHealth'

const DEFAULT_FILTERS = { excludeDone: true }

export default function App() {
  const [authed, setAuthed] = useState(() => !!getToken())
  const [allTasks, setAllTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'kanban'

  // Always fetch ALL tasks; filtering is done client-side so counts stay accurate
  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTasks({})
      setAllTasks(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  // Apply client-side filters to produce the visible task list
  const displayTasks = allTasks.filter(task => {
    // Status filter
    if (filters.status) {
      if (task.status !== filters.status) return false
    } else if (filters.excludeDone) {
      // Default: hide done tasks unless explicitly selected
      if (task.status === 'done') return false
    }

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (
        !task.title?.toLowerCase().includes(q) &&
        !task.description?.toLowerCase().includes(q)
      ) return false
    }

    // Owner filter
    if (filters.owner && task.owner !== filters.owner) return false

    // Priority filter
    if (filters.priority && task.priority !== filters.priority) return false

    // Effort filter
    if (filters.effort && task.estimated_token_effort !== filters.effort) return false

    return true
  })

  const handleFiltersChange = (f) => setFilters(f)
  const handleClearFilters = () => setFilters(DEFAULT_FILTERS)

  const handleAddSave = async (form) => {
    await createTask(form)
    setShowAdd(false)
    loadTasks()
  }

  const handleTaskSave = async (id, patch) => {
    const updated = await updateTask(id, patch)
    setAllTasks(ts => ts.map(t => t.id === id ? updated : t))
    setSelected(updated)
  }

  const handleTaskDelete = async (id) => {
    await deleteTask(id)
    setSelected(null)
    setAllTasks(ts => ts.filter(t => t.id !== id))
  }

  // Counts always come from allTasks (unfiltered)
  const counts = {
    backlog:       allTasks.filter(t => t.status === 'backlog').length,
    'in-progress': allTasks.filter(t => t.status === 'in-progress').length,
    review:        allTasks.filter(t => t.status === 'review').length,
    done:          allTasks.filter(t => t.status === 'done').length,
  }

  const handleSummaryCardClick = (key) => {
    setFilters(f => {
      if (f.status === key) {
        // Clicking the active card deselects — return to default
        return DEFAULT_FILTERS
      }
      // Clicking a card filters to that status (clears excludeDone)
      return { ...f, status: key, excludeDone: false }
    })
  }

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />
  }

  const handleLogout = async () => {
    await logout()
    setAuthed(false)
  }

  return (
    <>
      <nav className="navbar navbar-dark mb-4" style={{ backgroundColor: 'var(--color-primary)' }}>
        <div className="container-fluid">
          <span className="navbar-brand d-flex align-items-center gap-2">
            <img src="/logo.svg" alt="The Huddle logo" width="28" height="28" />
            The Huddle
          </span>
          <div className="d-flex gap-2 align-items-center">
            <SystemHealth />
            <div className="btn-group btn-group-sm" role="group" aria-label="View mode">
              <button
                className={`btn ${viewMode === 'list' ? 'btn-light' : 'btn-outline-light'}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >☰ List</button>
              <button
                className={`btn ${viewMode === 'kanban' ? 'btn-light' : 'btn-outline-light'}`}
                onClick={() => setViewMode('kanban')}
                title="Kanban view"
              >⬛ Kanban</button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
              + New task
            </button>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout} title="Sign out">
              ⎋ Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="container-xl pb-5">
        {/* Summary row */}
        <div className="row g-3 mb-4">
          {[
            { label: 'Backlog',     key: 'backlog',      color: 'secondary' },
            { label: 'In Progress', key: 'in-progress',  color: 'primary'   },
            { label: 'Review',      key: 'review',       color: 'warning'   },
            { label: 'Done',        key: 'done',         color: 'success'   },
          ].map(({ label, key, color }) => (
            <div key={key} className="col-6 col-md-3">
              <div
                className={`card text-bg-${color} h-100`}
                style={{ cursor: 'pointer', opacity: filters.status === key ? 1 : (key === 'done' && filters.excludeDone ? 0.6 : 1) }}
                onClick={() => handleSummaryCardClick(key)}
              >
                <div className="card-body py-3 text-center">
                  <div className="display-6 fw-bold">{counts[key]}</div>
                  <div className="small">{label}{key === 'done' && filters.excludeDone ? ' (hidden)' : ''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <FilterBar
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
        />

        {error && (
          <div className="alert alert-danger">
            Error: {error}{' '}
            <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => loadTasks()}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <div className="mt-2 text-muted">Loading tasks…</div>
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div style={{ fontSize: '3rem' }}>📋</div>
            <div>No tasks found.</div>
            <button className="btn btn-outline-primary mt-2" onClick={() => setShowAdd(true)}>Add the first task</button>
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard tasks={displayTasks} onTaskClick={setSelected} />
        ) : (
          <div className="row g-0">
            {displayTasks.map(task => (
              <div key={task.id} className="col-12 col-lg-6 col-xl-4 px-2">
                <TaskCard task={task} onClick={setSelected} />
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <TaskDetailModal
          task={selected}
          onClose={() => setSelected(null)}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
        />
      )}

      {showAdd && (
        <AddTaskModal
          onClose={() => setShowAdd(false)}
          onSave={handleAddSave}
        />
      )}
    </>
  )
}
