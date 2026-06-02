import { useState } from 'react'

export default function GroceryList({ items, onToggle, onRemove, onUpdate, onClearChecked, onClose, isFullPage }) {
  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  return (
    <div className={isFullPage ? 'grocery-page' : 'grocery-panel'}>
      <div className="grocery-header">
        <span className="grocery-title">Grocery List</span>
        {!isFullPage && <button className="grocery-close" onClick={onClose}>✕</button>}
      </div>

      {items.length === 0 ? (
        <div className="grocery-empty">
          Your list is empty.<br />Open a recipe to add ingredients.
        </div>
      ) : (
        <div className="grocery-items">
          {unchecked.map(item => (
            <GroceryItem key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} onUpdate={onUpdate} />
          ))}
          {checked.length > 0 && (
            <>
              <div className="grocery-section-label">Got it</div>
              {checked.map(item => (
                <GroceryItem key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} onUpdate={onUpdate} checked />
              ))}
            </>
          )}
        </div>
      )}

      {checked.length > 0 && (
        <div className="grocery-footer">
          <button className="btn-secondary btn-sm" onClick={onClearChecked}>Clear checked</button>
        </div>
      )}
    </div>
  )
}

function GroceryItem({ item, onToggle, onRemove, onUpdate, checked }) {
  const [editField, setEditField] = useState(null)
  const [draft, setDraft] = useState({ amount: item.amount, name: item.name })

  function startEdit(field) {
    setDraft({ amount: item.amount, name: item.name })
    setEditField(field)
  }

  function save() {
    if (draft.name.trim()) onUpdate(item.id, { amount: draft.amount, name: draft.name })
    setEditField(null)
  }

  function handleKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); save() }
    if (e.key === 'Escape') setEditField(null)
  }

  return (
    <div className={`grocery-item${checked ? ' checked' : ''}`}>
      <input
        type="checkbox"
        className="grocery-checkbox"
        checked={!!checked}
        onChange={() => onToggle(item.id)}
      />
      <div className="grocery-item-fields">
        {checked ? (
          <span className="grocery-item-text checked-text">
            {[item.amount, item.name].filter(Boolean).join(' ')}
          </span>
        ) : (
          <>
            {editField === 'amount' ? (
              <input
                autoFocus
                className="grocery-field-input grocery-amount-input"
                value={draft.amount}
                onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
                onBlur={save}
                onKeyDown={handleKey}
                placeholder="amt"
              />
            ) : (
              <span
                className={`grocery-amount-text${!item.amount ? ' grocery-placeholder' : ''}`}
                onClick={() => startEdit('amount')}
              >
                {item.amount || '—'}
              </span>
            )}
            {editField === 'name' ? (
              <input
                autoFocus
                className="grocery-field-input grocery-name-input"
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                onBlur={save}
                onKeyDown={handleKey}
              />
            ) : (
              <span className="grocery-name-text" onClick={() => startEdit('name')}>
                {item.name}
              </span>
            )}
          </>
        )}
        {item.recipeTitle && <span className="grocery-item-source">{item.recipeTitle}</span>}
      </div>
      <button className="grocery-remove" onClick={() => onRemove(item.id)}>✕</button>
    </div>
  )
}
