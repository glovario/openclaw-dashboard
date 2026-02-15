import TaskCard from './TaskCard'

const COLUMNS = [
  { key: 'backlog',      label: 'Backlog',      color: 'secondary' },
  { key: 'in-progress',  label: 'In Progress',  color: 'primary'   },
  { key: 'review',       label: 'Review',       color: 'warning'   },
  { key: 'done',         label: 'Done',         color: 'success'   },
]

export default function KanbanBoard({ tasks, onTaskClick }) {
  return (
    <div className="row g-3 kanban-board">
      {COLUMNS.map(({ key, label, color }) => {
        const colTasks = tasks.filter(t => t.status === key)
        return (
          <div key={key} className="col-12 col-sm-6 col-xl-3">
            <div className="kanban-column h-100">
              <div className={`kanban-column-header text-bg-${color} rounded-top px-3 py-2 d-flex justify-content-between align-items-center`}>
                <span className="fw-semibold">{label}</span>
                <span className="badge bg-white text-dark">{colTasks.length}</span>
              </div>
              <div className="kanban-column-body p-2 rounded-bottom border border-top-0">
                {colTasks.length === 0 ? (
                  <div className="text-center text-muted py-4 small">No tasks</div>
                ) : (
                  colTasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={onTaskClick} />
                  ))
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
