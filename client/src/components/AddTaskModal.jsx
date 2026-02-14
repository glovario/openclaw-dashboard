import TaskForm from './TaskForm'

export default function AddTaskModal({ onClose, onSave }) {
  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">New Task</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <TaskForm task={null} onSave={onSave} onCancel={onClose} />
          </div>
        </div>
      </div>
    </div>
  )
}
