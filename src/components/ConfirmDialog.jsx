import { createPortal } from 'react-dom'

// Rendered into document.body: hosts like RecipeDetail are fixed overlays with
// their own stacking context, which would trap this below the bottom nav.
export default function ConfirmDialog({ message, confirmLabel = 'Delete', onConfirm, onCancel, centered = false }) {
  return createPortal(
    <div className={`modal-overlay${centered ? ' modal-overlay--centered' : ''}`} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal confirm-modal">
        <div className="confirm-body">
          <p className="confirm-message">{message}</p>
          <div className="confirm-actions">
            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
