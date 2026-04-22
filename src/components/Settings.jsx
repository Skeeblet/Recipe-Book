import { useState } from 'react'
import { COLOR_PALETTE, BUILT_IN_TAGS } from '../hooks/useTags.js'
import ConfirmDialog from './ConfirmDialog.jsx'

export default function Settings({
  allTags, customTags, recipes,
  settings, onSettingChange,
  onEditTag, onDeleteTag,
  onEditRecipe, onDeleteRecipe,
  onClose,
}) {
  const [tab, setTab] = useState('recipes')

  return (
    <div className="settings-overlay">
      <div className="settings-topbar">
        <button className="detail-back-btn" onClick={onClose}>← Back</button>
        <span className="settings-title">Settings</span>
        <div style={{ width: 80 }} />
      </div>
      <div className="settings-tabs">
        {['recipes', 'tags', 'preferences'].map(t => (
          <button
            key={t}
            className={`settings-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="settings-content">
        {tab === 'recipes'     && <RecipesTab recipes={recipes} allTags={allTags} onEdit={onEditRecipe} onDelete={onDeleteRecipe} />}
        {tab === 'tags'        && <TagsTab customTags={customTags} recipes={recipes} onEdit={onEditTag} onDelete={onDeleteTag} />}
        {tab === 'preferences' && <PrefsTab settings={settings} onChange={onSettingChange} />}
      </div>
    </div>
  )
}

/* ── Recipes tab ─────────────────────────────────────── */
function RecipesTab({ recipes, allTags, onEdit, onDelete }) {
  const [confirmId, setConfirmId] = useState(null)
  const confirmRecipe = recipes.find(r => r.id === confirmId)

  return (
    <div className="settings-section">
      <p className="settings-hint">All recipes. Seed recipes can be edited but not deleted.</p>
      <div className="settings-recipe-list">
        {recipes.map(recipe => (
          <div key={recipe.id} className="settings-recipe-row">
            <div className="settings-recipe-info">
              <span className="settings-recipe-title">{recipe.title}</span>
              <div className="settings-recipe-tags">
                {recipe.tags.slice(0, 4).map(tag => {
                  const def = allTags.find(t => t.tag === tag)
                  if (!def) return null
                  return (
                    <span key={tag} className="rtag rtag-sm" style={{ background: def.color.bg, color: def.color.text }}>
                      {def.label}
                    </span>
                  )
                })}
              </div>
            </div>
            <div className="settings-recipe-actions">
              <button className="settings-action-btn" onClick={() => onEdit(recipe)}>Edit</button>
              {recipe.id.startsWith('user-') && (
                <button className="settings-action-btn danger" onClick={() => setConfirmId(recipe.id)}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {confirmRecipe && (
        <ConfirmDialog
          message={`Delete "${confirmRecipe.title}"? This cannot be undone.`}
          onConfirm={() => { onDelete(confirmRecipe.id); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}

/* ── Tags tab ────────────────────────────────────────── */
function TagsTab({ customTags, recipes, onEdit, onDelete }) {
  const [editingSlug, setEditingSlug] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null) // tag slug
  const [showColorPicker, setShowColorPicker] = useState(false)

  function startEdit(tag) {
    setEditingSlug(tag.tag)
    setEditLabel(tag.label)
    setEditColor(tag.color)
    setShowColorPicker(false)
  }

  function saveEdit() {
    if (editLabel.trim()) onEdit(editingSlug, { label: editLabel.trim(), color: editColor })
    setEditingSlug(null)
  }

  function handleDeleteClick(slug) {
    setPendingDelete(slug)
  }

  function confirmDelete() {
    onDelete(pendingDelete)
    setPendingDelete(null)
  }

  const affectedRecipes = pendingDelete
    ? recipes.filter(r => r.tags.includes(pendingDelete))
    : []

  return (
    <div className="settings-section">
      <p className="settings-hint">Built-in tags are read-only. Custom tags can be edited or deleted.</p>

      <div className="settings-tag-group-label">Built-in</div>
      {BUILT_IN_TAGS.map(tag => (
        <div key={tag.tag} className="settings-tag-row readonly">
          <span className="rtag" style={{ background: tag.color.bg, color: tag.color.text }}>{tag.label}</span>
          <span className="settings-tag-slug">{tag.tag}</span>
        </div>
      ))}

      {customTags.length > 0 && (
        <>
          <div className="settings-tag-group-label" style={{ marginTop: 20 }}>Custom</div>
          {customTags.map(tag => (
            <div key={tag.tag} className="settings-tag-row">
              {editingSlug === tag.tag ? (
                <div className="settings-tag-edit">
                  <button
                    className="settings-color-swatch"
                    style={{ background: editColor.bg, borderColor: editColor.text }}
                    onClick={() => setShowColorPicker(p => !p)}
                  />
                  <input
                    autoFocus
                    className="settings-tag-input"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingSlug(null) }}
                  />
                  <button className="btn-primary btn-sm" onClick={saveEdit}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditingSlug(null)}>Cancel</button>
                  {showColorPicker && (
                    <div className="settings-color-picker">
                      {COLOR_PALETTE.map((c, i) => (
                        <button
                          key={i}
                          className={`color-swatch${editColor === c || (editColor.bg === c.bg && editColor.text === c.text) ? ' selected' : ''}`}
                          style={{ background: c.bg, borderColor: editColor.bg === c.bg ? c.text : 'transparent' }}
                          onClick={() => setEditColor(c)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span className="rtag" style={{ background: tag.color.bg, color: tag.color.text }}>{tag.label}</span>
                  <span className="settings-tag-slug">{tag.tag}</span>
                  <div className="settings-tag-actions">
                    <button className="settings-action-btn" onClick={() => startEdit(tag)}>Edit</button>
                    <button className="settings-action-btn danger" onClick={() => handleDeleteClick(tag.tag)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </>
      )}

      {pendingDelete && (
        <div className="settings-delete-warning">
          <p>
            <strong>Delete "{customTags.find(t => t.tag === pendingDelete)?.label}"?</strong>
            {affectedRecipes.length > 0 ? (
              <> This tag will be removed from {affectedRecipes.length} recipe{affectedRecipes.length > 1 ? 's' : ''}:</>
            ) : (
              <> This tag is not used by any recipes.</>
            )}
          </p>
          {affectedRecipes.length > 0 && (
            <ul className="settings-affected-list">
              {affectedRecipes.map(r => <li key={r.id}>{r.title}</li>)}
            </ul>
          )}
          <div className="settings-warning-actions">
            <button className="btn-secondary btn-sm" onClick={() => setPendingDelete(null)}>Cancel</button>
            <button className="btn-danger btn-sm" onClick={confirmDelete}>Delete tag</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Preferences tab ─────────────────────────────────── */
function PrefsTab({ settings, onChange }) {
  return (
    <div className="settings-section">
      <div className="pref-row">
        <div className="pref-info">
          <span className="pref-label">Smart unit conversion</span>
          <span className="pref-desc">
            Automatically convert oz → lb, tsp → tbsp → cup, etc. when scaling ingredient amounts.
          </span>
        </div>
        <button
          className={`toggle-btn${settings.smartUnits ? ' on' : ''}`}
          onClick={() => onChange('smartUnits', !settings.smartUnits)}
          role="switch"
          aria-checked={settings.smartUnits}
        >
          <span className="toggle-knob" />
        </button>
      </div>
    </div>
  )
}
