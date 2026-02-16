import { useState, useEffect, useCallback } from 'react'
import { fetchTasks, createTask, updateTask, deleteTask } from './api'
import { STATUSES, STATUS_META } from './constants'
import FilterBar from './components/FilterBar'
import TaskCard from './components/TaskCard'
import KanbanBoard from './components/KanbanBoard'
import TaskDetailModal from './components/TaskDetailModal'
import AddTaskModal from './components/AddTaskModal'
import SystemHealth from './components/SystemHealth'

const DEFAULT_FILTERS = { excludeDone: true }

export default function App() {
  const [allTasks, setAllTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'kanban'

  // OC-037: pagination state
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 })

  // Always fetch ALL tasks (high limit); filtering is done client-side so counts stay accurate
  // OC-037: we pass limit/offset to support pagination
  const loadTasks = useCallback(async (paginationOverride = {}) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchTasks({ limit: 500, ...paginationOverride })
      setAllTasks(result.tasks)
      setPagination({ total: result.total, limit: result.limit, offset: result.offset })
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
  const counts = Object.fromEntries(
    STATUSES.map(s => [s, allTasks.filter(t => t.status === s).length])
  )

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
          </div>
        </div>
      </nav>

      <div className="container-xl pb-5">
        {/* OC-041: Status Summary Cards — all workflow states, dynamic from STATUS_META */}
        <div className="row g-2 mb-4">
          {STATUSES.map(key => {
            const meta = STATUS_META[key]
            const isDone = key === 'done'
            const isHidden = isDone && filters.excludeDone && !filters.status
            const isActive = filters.status === key
            return (
              <div key={key} className="col-6 col-sm-4 col-md-3 col-xl">
                <div
                  className={`card h-100 status-summary-card ${isActive ? `text-bg-${meta.color}` : 'border'}`}
                  style={{
                    cursor: 'pointer',
                    opacity: isHidden ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    borderColor: isActive ? undefined : `var(--bs-${meta.color === 'purple' ? 'purple' : meta.color}-border-subtle, #dee2e6)`,
                  }}
                  onClick={() => handleSummaryCardClick(key)}
                  title={isHidden ? `${meta.label} tasks are hidden by default — click to show` : `Filter by ${meta.label}`}
                >
                  <div className="card-body py-2 px-3 text-center">
                    <div className={`fs-4 fw-bold ${isActive ? '' : `text-${meta.color === 'purple' ? '' : meta.color}`}`}
                      style={isActive ? {} : meta.color === 'purple' ? { color: '#6f42c1' } : {}}>
                      {counts[key]}
                    </div>
                    <div className={`small fw-semibold ${isActive ? '' : 'text-muted'}`} style={{ fontSize: '0.72rem', lineHeight: 1.3 }}>
                      {meta.label}
                      {isHidden && <span className="d-block" style={{ fontSize: '0.65rem', opacity: 0.75 }}>(hidden)</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
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
