import TaskForm from './TaskForm'

/**
 * Modal wrapper that renders `TaskForm` for creating a new task.
 * @param {{onClose:function, onSave:function}} props
 */
export default function AddTaskModal({ onClose, onSave }) {
  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header border-bottom pb-3">
            <div>
              <h5 className="modal-title fw-bold mb-0">New Task</h5>
              <p className="text-muted small mb-0 mt-1">Fill in the details below to create a new task.</p>
            </div>
            <button type="button" className="btn-close ms-3" onClick={onClose} />
          </div>
          <div className="modal-body pt-4">
            <TaskForm task={null} onSave={onSave} onCancel={onClose} />
          </div>
        </div>
      </div>
    </div>
  )
}
