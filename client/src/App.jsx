import { useState, useEffect, useCallback } from 'react'
import { fetchTasks, createTask, updateTask, deleteTask } from './api'
import FilterBar from './components/FilterBar'
import TaskCard from './components/TaskCard'
import TaskDetailModal from './components/TaskDetailModal'
import AddTaskModal from './components/AddTaskModal'

export default function App() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({})
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const loadTasks = useCallback(async (f = filters) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTasks(f)
      setTasks(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { loadTasks(filters) }, [filters])

  const handleFiltersChange = (f) => setFilters(f)
  const handleClearFilters = () => setFilters({})

  const handleAddSave = async (form) => {
    await createTask(form)
    setShowAdd(false)
    loadTasks(filters)
  }

  const handleTaskSave = async (id, patch) => {
    const updated = await updateTask(id, patch)
    setTasks(ts => ts.map(t => t.id === id ? updated : t))
    setSelected(updated)
  }

  const handleTaskDelete = async (id) => {
    await deleteTask(id)
    setSelected(null)
    setTasks(ts => ts.filter(t => t.id !== id))
  }

  const counts = {
    backlog:      tasks.filter(t => t.status === 'backlog').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    review:       tasks.filter(t => t.status === 'review').length,
    done:         tasks.filter(t => t.status === 'done').length,
  }

  return (
    <>
      <nav className="navbar navbar-dark bg-dark mb-4">
        <div className="container-fluid">
          <span className="navbar-brand">🐾 OpenClaw Dashboard</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            + New task
          </button>
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
                style={{ cursor: 'pointer' }}
                onClick={() => setFilters(f => ({ ...f, status: f.status === key ? '' : key }))}
              >
                <div className="card-body py-3 text-center">
                  <div className="display-6 fw-bold">{counts[key]}</div>
                  <div className="small">{label}</div>
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
        ) : tasks.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div style={{ fontSize: '3rem' }}>📋</div>
            <div>No tasks found.</div>
            <button className="btn btn-outline-primary mt-2" onClick={() => setShowAdd(true)}>Add the first task</button>
          </div>
        ) : (
          <div className="row g-0">
            {tasks.map(task => (
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
