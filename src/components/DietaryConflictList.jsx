// Checkbox list of dietary conflicts with a select-all toggle. Controlled:
// `selected` is a Set of ingredient indexes, `onChange` receives the next Set.
export default function DietaryConflictList({ conflicts, selected, onChange }) {
  const allSelected = conflicts.length > 0 && conflicts.every(c => selected.has(c.index))

  function toggle(index) {
    const next = new Set(selected)
    next.has(index) ? next.delete(index) : next.add(index)
    onChange(next)
  }

  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(conflicts.map(c => c.index)))
  }

  return (
    <div className="dietary-conflicts">
      <div className="dietary-conflict-head">
        <span>{conflicts.length} conflicting ingredient{conflicts.length !== 1 ? 's' : ''}</span>
        <button type="button" className="dietary-select-all" onClick={toggleAll}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <ul className="ai-diff-list">
        {conflicts.map(c => (
          <li key={c.index} className="dietary-conflict-row">
            <label className="dietary-conflict-main">
              <input
                type="checkbox"
                className="ps-assign-check"
                checked={selected.has(c.index)}
                onChange={() => toggle(c.index)}
              />
              <span className="dietary-conflict-text">
                <span className="dietary-conflict-swap">
                  <span className="ai-diff-name dietary-conflict-old">{c.ingredient}</span>
                  <span className="ai-diff-arrow">→</span>
                  {c.substitute
                    ? <span className="ai-diff-name">{c.substitute.name}{c.substitute.amount ? ` (${c.substitute.amount})` : ''}</span>
                    : <span className="ai-diff-amount">remove</span>}
                </span>
                {(c.restriction || c.reason) && (
                  <span className="dietary-conflict-reason">
                    {c.restriction && <span className="ai-diff-tag ai-diff-tag--removed">{c.restriction}</span>}
                    {c.reason && <span>{c.reason}</span>}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
