export default function ConfirmDialog({ message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal confirm-modal">
        <div className="confirm-body">
          <p className="confirm-message">{message}</p>
          <div className="confirm-actions">
            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
