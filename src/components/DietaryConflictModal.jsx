import { useState } from 'react'
import { createPortal } from 'react-dom'
import DietaryConflictList from './DietaryConflictList.jsx'

// Import-time popup: the recipe conflicts with the user's restrictions. They
// can continue as-is, or pick ingredients to swap for AI substitutes.
export default function DietaryConflictModal({ conflicts, onContinue, onReplace, onCancel }) {
  const [selected, setSelected] = useState(() => new Set(conflicts.map(c => c.index)))

  return createPortal(
    <div className="modal-overlay modal-overlay--centered" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal ai-modal">
        <div className="modal-header">
          <h2>Dietary conflicts</h2>
          <button className="modal-close" onClick={onCancel} aria-label="Cancel import">✕</button>
        </div>
        <div className="modal-body">
          <p className="import-hint">
            This recipe conflicts with your dietary restrictions. Continue with it as-is, or
            select the ingredients to replace with substitutes.
          </p>
          <DietaryConflictList conflicts={conflicts} selected={selected} onChange={setSelected} />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onContinue}>Continue as-is</button>
          <button
            type="button"
            className="btn-primary"
            disabled={selected.size === 0}
            onClick={() => onReplace([...selected])}
          >
            Replace selected{selected.size ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
