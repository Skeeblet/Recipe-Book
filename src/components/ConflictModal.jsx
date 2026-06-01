import { useState } from 'react'

export default function ConflictModal({ conflicts, onResolve }) {
  const [idx, setIdx] = useState(0)
  if (!conflicts.length) return null
  const recipe = conflicts[idx]

  function resolve(action) {
    onResolve(recipe, action)
    setIdx(i => i + 1)
  }

  return (
    <div className="modal-overlay">
      <div className="modal conflict-modal">
        <div className="modal-header">
          <h2>Recipe not in cloud ({idx + 1} of {conflicts.length})</h2>
        </div>
        <div className="modal-body">
          <p className="conflict-recipe-name">{recipe.title}</p>
          {recipe.description && (
            <p className="conflict-recipe-desc">{recipe.description}</p>
          )}
          <p className="conflict-recipe-meta">
            {recipe.ingredients?.length ?? 0} ingredients · {recipe.steps?.length ?? 0} steps
          </p>
          <p className="conflict-hint">
            This recipe is on this device but not in your cloud account.
          </p>
        </div>
        <div className="modal-footer conflict-actions">
          <button className="btn-primary" onClick={() => resolve('keep')}>Add to cloud</button>
          <button className="btn-secondary" onClick={() => resolve('discard')}>Discard it</button>
        </div>
      </div>
    </div>
  )
}
