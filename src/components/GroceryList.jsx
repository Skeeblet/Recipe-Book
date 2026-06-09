import { useState, useRef, useEffect } from 'react'
import ConfirmDialog from './ConfirmDialog.jsx'

const SORT_OPTIONS = [
  { value: 'alpha',       label: 'A → Z' },
  { value: 'by-recipe',   label: 'By recipe' },
  { value: 'by-category', label: 'By category' },
  { value: 'by-checked',  label: 'By checked' },
]

function groupBy(items, key) {
  const groups = new Map()
  for (const item of items) {
    const k = item[key] || (key === 'category' ? 'Other' : 'Added manually')
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(item)
  }
  return groups
}

export default function GroceryList({ items, onToggle, onRemove, onUpdate, onClearChecked, onClearAll, onClose, onAddItem, isFullPage }) {
  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const [sortBy, setSortBy] = useState('alpha')
  const [showAddRow, setShowAddRow] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  function renderUnchecked() {
    if (sortBy === 'by-recipe') {
      const groups = groupBy(unchecked, 'recipeTitle')
      return Array.from(groups.entries()).map(([label, groupItems]) => (
        <div key={label}>
          <div className="grocery-group-label">{label}</div>
          {groupItems.map(item => (
            <GroceryItem key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} onUpdate={onUpdate} />
          ))}
        </div>
      ))
    }
    if (sortBy === 'by-category') {
      const groups = groupBy(unchecked, 'category')
      // Order: known categories first, then Other
      const categoryOrder = ['Produce', 'Dairy', 'Meat', 'Seafood', 'Bakery', 'Frozen', 'Pantry', 'Spices', 'Beverages', 'Other']
      const sorted = [...groups.entries()].sort(([a], [b]) => {
        const ai = categoryOrder.indexOf(a)
        const bi = categoryOrder.indexOf(b)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
      return sorted.map(([label, groupItems]) => (
        <div key={label}>
          <div className="grocery-group-label">{label}</div>
          {groupItems.map(item => (
            <GroceryItem key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} onUpdate={onUpdate} />
          ))}
        </div>
      ))
    }
    // alpha (default) / by-checked: flat list sorted A→Z by name
    const sorted = [...unchecked].sort((a, b) => a.name.localeCompare(b.name))
    return sorted.map(item => (
      <GroceryItem key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} onUpdate={onUpdate} />
    ))
  }

  return (
    <div className={isFullPage ? 'grocery-page' : 'grocery-panel'}>
      <div className="grocery-header">
        <span className="grocery-title">Grocery List</span>
        {!isFullPage && <button className="grocery-close" onClick={onClose}>✕</button>}
      </div>

      <div className="grocery-scroll-area">
        <div className="grocery-controls">
          <button
            className="grocery-add-btn"
            onClick={() => setShowAddRow(v => !v)}
          >
            + Add item
          </button>
          {items.length > 0 && (
            <button className="grocery-add-btn grocery-clear-all-btn" onClick={() => setConfirmClear(true)}>
              Clear list
            </button>
          )}
          <select
            className="grocery-sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {items.length === 0 && !showAddRow ? (
          <div className="grocery-empty">
            Your list is empty.<br />Open a recipe to add ingredients.
          </div>
        ) : (
          <div className="grocery-items">
            {showAddRow && (
              <AddItemRow
                onAdd={(name, amount) => { onAddItem(name, amount); }}
                onClose={() => setShowAddRow(false)}
              />
            )}
            {renderUnchecked()}
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

      {confirmClear && (
        <ConfirmDialog
          centered
          message="Clear your entire grocery list? This cannot be undone."
          confirmLabel="Clear list"
          onConfirm={() => { onClearAll(); setConfirmClear(false) }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  )
}

function AddItemRow({ onAdd, onClose }) {
  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  function submit() {
    if (!name.trim()) return
    onAdd(name.trim(), amount.trim())
    setName('')
    setAmount('')
    nameRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="grocery-add-row">
      <input
        className="grocery-field-input grocery-amount-input"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="qty"
        aria-label="Amount"
      />
      <input
        ref={nameRef}
        className="grocery-field-input grocery-name-input grocery-add-name-input"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Item name"
        aria-label="Item name"
      />
      <button
        className="grocery-add-confirm"
        onClick={submit}
        aria-label="Add item"
      >✓</button>
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
