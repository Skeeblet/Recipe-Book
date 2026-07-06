import { useState, useEffect } from 'react'
import ConfirmDialog from './ConfirmDialog.jsx'
import { COLOR_PALETTE } from '../hooks/useTags.js'

/* eslint-disable no-undef */
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '—'
/* eslint-enable no-undef */

export default function ProfilePage({ auth, data, handlers, pwa, initialPage, onInitialPageConsumed }) {
  const [activePage, setActivePage] = useState(initialPage || null)

  // Consume the initialPage flag so it doesn't re-trigger on re-renders
  useEffect(() => {
    if (initialPage) onInitialPageConsumed?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Push a history entry when a sub-page opens so the device back button returns to the hub
  useEffect(() => {
    if (!activePage) return
    window.history.pushState({ profileSubPage: activePage }, '')
    function onPopState() { setActivePage(null) }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [!!activePage]) // eslint-disable-line react-hooks/exhaustive-deps

  const subProps = { auth, data, handlers, pwa, onBack: () => window.history.back() }

  if (activePage === 'account') return <AccountPage {...subProps} />
  if (activePage === 'recipes') return <RecipesPage {...subProps} />
  if (activePage === 'tags')    return <TagsPage    {...subProps} />
  if (activePage === 'display') return <DisplayPage {...subProps} />
  if (activePage === 'appinfo') return <AppInfoPage {...subProps} />

  return <ProfileHub auth={auth} onNavigate={setActivePage} />
}

/* ── Hub ─────────────────────────────────────────────────────────── */
function ProfileHub({ auth, onNavigate }) {
  const { user, authLoading, onSignIn, onSignOut, onDeleteAccount } = auth
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <div className="profile-page-scroll">
      {/* Profile block */}
      <div className="ps-profile-block">
        <div className="ps-avatar-wrap">
          {user?.photoURL
            ? <img className="ps-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            : <div className="ps-avatar ps-avatar--placeholder" />
          }
        </div>
        {user ? (
          <>
            <p className="ps-name">{user.displayName}</p>
            <p className="ps-email">{user.email}</p>
          </>
        ) : (
          <>
            <p className="ps-name">Not signed in</p>
            <p className="ps-hint">Sign in to sync recipes across devices.</p>
          </>
        )}
        <div className="ps-auth-row">
          {user
            ? <button className="btn-secondary ps-auth-btn" onClick={onSignOut}>Sign out</button>
            : <button className="btn-primary ps-auth-btn" onClick={onSignIn} disabled={authLoading}>Sign in with Google</button>
          }
        </div>
      </div>

      {/* Nav rows */}
      <div className="ps-hub-group">
        <div className="ps-hub-group-label">Settings</div>

        <div className="ps-hub-rows">
          {['Account', 'Recipes', 'Tags', 'Display', 'App info'].map(label => (
            <button
              key={label}
              className="ps-hub-nav-btn"
              onClick={() => onNavigate(label.toLowerCase().replace(' ', ''))}
            >
              <span className="ps-hub-row-label">{label}</span>
              <span className="ps-hub-chevron">›</span>
            </button>
          ))}
        </div>
      </div>

      {user && (
        <div className="ps-hub-group">
          <div className="ps-hub-rows">
            <button className="ps-hub-nav-btn ps-hub-nav-btn--danger" onClick={() => setShowDeleteConfirm(true)}>
              <span className="ps-hub-row-label ps-hub-row-label--danger">Delete account</span>
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          message="This permanently deletes all your recipes, tags, and settings from the cloud. Local data on this device is also cleared. This cannot be undone."
          confirmLabel="Delete my account"
          onConfirm={() => { setShowDeleteConfirm(false); onDeleteAccount() }}
          onCancel={() => setShowDeleteConfirm(false)}
          centered
        />
      )}
    </div>
  )
}

/* ── Sub-page shell ──────────────────────────────────────────────── */
function SubPage({ title, onBack, children }) {
  return (
    <div className="ps-subpage">
      <div className="ps-subpage-topbar">
        <button className="detail-back-btn" onClick={onBack}>← Back</button>
        <span className="ps-subpage-title">{title}</span>
        <div style={{ width: 80 }} />
      </div>
      <div className="ps-subpage-content">
        {children}
      </div>
    </div>
  )
}

/* ── Account sub-page ────────────────────────────────────────────── */
function AccountPage({ data, handlers, onBack }) {
  const { settings } = data
  const { onSettingChange } = handlers
  const isClaude = settings.aiModel === 'claude-sonnet'

  return (
    <SubPage title="Account" onBack={onBack}>
      <div className="ps-rows">
        <div className="ps-row ps-row--stacked">
          <div className="ps-row-main">
            <span className="ps-label">AI import model</span>
            <select
              className="ps-select"
              value={settings.aiModel || 'gemini-1.5-flash'}
              onChange={e => onSettingChange('aiModel', e.target.value)}
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (free)</option>
              <option value="claude-sonnet">Claude Sonnet</option>
            </select>
          </div>
          <a
            className="ps-key-link"
            href={isClaude ? 'https://console.anthropic.com/settings/keys' : 'https://aistudio.google.com/apikey'}
            target="_blank"
            rel="noopener noreferrer"
          >
            {isClaude
              ? 'Get a Claude API key at console.anthropic.com ↗'
              : 'Get a free Gemini API key at aistudio.google.com ↗'}
          </a>
        </div>

        <div className="ps-row">
          <div className="ps-row-label">
            <span className="ps-label">AI API key</span>
            <span className="ps-desc">Used for recipe import and ingredient sorting. Stays on this device.</span>
          </div>
          <input
            type="password"
            className="ps-input"
            value={settings.aiApiKey || ''}
            onChange={e => onSettingChange('aiApiKey', e.target.value)}
            placeholder="Paste API key…"
          />
        </div>
      </div>
    </SubPage>
  )
}

/* ── Recipes sub-page ────────────────────────────────────────────── */
function RecipesPage({ data, handlers, onBack }) {
  const { recipes, allTags } = data
  const { onOpenRecipe, onEditRecipe, onDeleteRecipe } = handlers
  const [query, setQuery] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const filtered = query.trim()
    ? recipes.filter(r => r.title.toLowerCase().includes(query.toLowerCase()))
    : recipes

  const confirmRecipe = recipes.find(r => r.id === confirmId)

  return (
    <SubPage title="Recipes" onBack={onBack}>
      <div className="ps-subpage-search-wrap">
        <input
          className="ps-search ps-search--full"
          type="search"
          placeholder="Search recipes…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <div className="settings-recipe-list">
        {filtered.length === 0 && (
          <div className="ps-empty">No recipes match that search.</div>
        )}
        {filtered.map(recipe => (
          <div key={recipe.id} className="settings-recipe-row">
            <div className="settings-recipe-info">
              <button className="ps-recipe-name-btn" onClick={() => onOpenRecipe(recipe)}>
                {recipe.title}
              </button>
              <div className="settings-recipe-tags">
                {recipe.tags.slice(0, 3).map(tag => {
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
              <button className="settings-action-btn" onClick={() => onEditRecipe(recipe)}>Edit</button>
              <button className="settings-action-btn danger" onClick={() => setConfirmId(recipe.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {confirmRecipe && (
        <ConfirmDialog
          message={`Delete "${confirmRecipe.title}"? This cannot be undone.`}
          onConfirm={() => { onDeleteRecipe(confirmRecipe.id); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
          centered
        />
      )}
    </SubPage>
  )
}

/* ── Tags sub-page ───────────────────────────────────────────────── */
function TagsPage({ data, handlers, onBack }) {
  const { allTags, recipes } = data
  const { onAddTag, onEditTag, onDeleteTag, onUpdateRecipe } = handlers
  const [showAddForm, setShowAddForm] = useState(false)
  const [addLabel, setAddLabel] = useState('')
  const [addColor, setAddColor] = useState(COLOR_PALETTE[0])
  const [showAddColorPicker, setShowAddColorPicker] = useState(false)
  const [editingSlug, setEditingSlug] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState(null)
  const [showEditColorPicker, setShowEditColorPicker] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [taggingTag, setTaggingTag] = useState(null)

  function saveAdd() {
    const trimmed = addLabel.trim()
    if (!trimmed) return
    const slug = onAddTag(trimmed, addColor)
    if (slug) setTaggingTag({ tag: slug, label: trimmed, color: addColor })
    setAddLabel(''); setAddColor(COLOR_PALETTE[0])
    setShowAddForm(false); setShowAddColorPicker(false)
  }

  function startEdit(tag) {
    setEditingSlug(tag.tag); setEditLabel(tag.label)
    setEditColor(tag.color); setShowEditColorPicker(false)
  }

  function saveEdit() {
    if (editLabel.trim()) onEditTag(editingSlug, { label: editLabel.trim(), color: editColor })
    setEditingSlug(null)
  }

  function applyTagging(selectedIds) {
    recipes.forEach(recipe => {
      const hasTag = recipe.tags.includes(taggingTag.tag)
      const shouldHave = selectedIds.has(recipe.id)
      if (hasTag !== shouldHave) {
        const newTags = shouldHave
          ? [...recipe.tags, taggingTag.tag]
          : recipe.tags.filter(t => t !== taggingTag.tag)
        onUpdateRecipe(recipe.id, { ...recipe, tags: newTags })
      }
    })
    setTaggingTag(null)
  }

  const affectedRecipes = pendingDelete ? recipes.filter(r => r.tags.includes(pendingDelete)) : []
  const pendingTag = allTags.find(t => t.tag === pendingDelete)

  return (
    <>
      <SubPage title="Tags" onBack={onBack}>
        <div className="ps-tags-add-row">
          <button className="settings-action-btn" onClick={() => { setShowAddForm(p => !p); setShowAddColorPicker(false) }}>
            + Add tag
          </button>
        </div>

        {showAddForm && (
          <div className="ps-add-tag-form">
            <div className="settings-tag-edit">
              <button
                className="settings-color-swatch"
                style={{ background: addColor.bg, borderColor: addColor.text }}
                onClick={() => setShowAddColorPicker(p => !p)}
              />
              <input
                autoFocus
                className="settings-tag-input"
                placeholder="Tag name…"
                value={addLabel}
                onChange={e => setAddLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveAdd(); if (e.key === 'Escape') setShowAddForm(false) }}
              />
              <button className="btn-primary btn-sm" onClick={saveAdd}>Save</button>
              <button className="btn-secondary btn-sm" onClick={() => { setShowAddForm(false); setShowAddColorPicker(false) }}>Cancel</button>
              {showAddColorPicker && (
                <div className="settings-color-picker">
                  {COLOR_PALETTE.map((c, i) => (
                    <button key={i} className={`color-swatch${addColor.bg === c.bg ? ' selected' : ''}`}
                      style={{ background: c.bg, borderColor: addColor.bg === c.bg ? c.text : 'transparent' }}
                      onClick={() => setAddColor(c)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {allTags.map(tag => (
          <div key={tag.tag} className="settings-tag-row">
            {editingSlug === tag.tag ? (
              <div className="settings-tag-edit" style={{ flex: 1 }}>
                <button className="settings-color-swatch"
                  style={{ background: editColor.bg, borderColor: editColor.text }}
                  onClick={() => setShowEditColorPicker(p => !p)} />
                <input autoFocus className="settings-tag-input" value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingSlug(null) }} />
                <button className="btn-primary btn-sm" onClick={saveEdit}>Save</button>
                <button className="btn-secondary btn-sm" onClick={() => setEditingSlug(null)}>Cancel</button>
                {showEditColorPicker && (
                  <div className="settings-color-picker">
                    {COLOR_PALETTE.map((c, i) => (
                      <button key={i} className={`color-swatch${editColor.bg === c.bg ? ' selected' : ''}`}
                        style={{ background: c.bg, borderColor: editColor.bg === c.bg ? c.text : 'transparent' }}
                        onClick={() => setEditColor(c)} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <span className="rtag" style={{ background: tag.color.bg, color: tag.color.text }}>{tag.label}</span>
                <div className="settings-tag-actions">
                  <button className="settings-action-btn" onClick={() => setTaggingTag(tag)}>Assign</button>
                  <button className="settings-action-btn" onClick={() => startEdit(tag)}>Edit</button>
                  <button className="settings-action-btn danger" onClick={() => setPendingDelete(tag.tag)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}

        {pendingDelete && (
          <ConfirmDialog
            message={
              affectedRecipes.length > 0
                ? `Delete "${pendingTag?.label}"? It will be removed from ${affectedRecipes.length} recipe${affectedRecipes.length > 1 ? 's' : ''}.`
                : `Delete "${pendingTag?.label}"? This tag is not used by any recipes.`
            }
            confirmLabel="Delete tag"
            onConfirm={() => { onDeleteTag(pendingDelete); setPendingDelete(null) }}
            onCancel={() => setPendingDelete(null)}
            centered
          />
        )}
      </SubPage>

      {taggingTag && (
        <RecipeSelector
          tag={taggingTag}
          recipes={recipes}
          onApply={applyTagging}
          onClose={() => setTaggingTag(null)}
        />
      )}
    </>
  )
}

/* ── Recipe selector overlay ─────────────────────────────────────── */
function RecipeSelector({ tag, recipes, onApply, onClose }) {
  const [selected, setSelected] = useState(
    () => new Set(recipes.filter(r => r.tags.includes(tag.tag)).map(r => r.id))
  )
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? recipes.filter(r => r.title.toLowerCase().includes(query.toLowerCase()))
    : recipes

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="ps-subpage ps-subpage--elevated">
      <div className="ps-subpage-topbar">
        <button className="detail-back-btn" onClick={onClose}>Cancel</button>
        <span className="ps-subpage-title">
          <span className="rtag" style={{ background: tag.color.bg, color: tag.color.text }}>{tag.label}</span>
        </span>
        <button className="btn-primary btn-sm" onClick={() => onApply(selected)}>
          Apply{selected.size > 0 ? ` (${selected.size})` : ''}
        </button>
      </div>
      <div className="ps-subpage-content">
        <div className="ps-subpage-search-wrap">
          <input
            className="ps-search ps-search--full"
            type="search"
            placeholder="Search recipes…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="settings-recipe-list">
          {filtered.length === 0 && <div className="ps-empty">No recipes match that search.</div>}
          {filtered.map(recipe => (
            <label key={recipe.id} className="settings-recipe-row ps-assign-row">
              <input
                type="checkbox"
                className="ps-assign-check"
                checked={selected.has(recipe.id)}
                onChange={() => toggle(recipe.id)}
              />
              <span className="settings-recipe-title">{recipe.title}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Display sub-page ────────────────────────────────────────────── */
function DisplayPage({ data, handlers, onBack }) {
  const { settings } = data
  const { onSettingChange } = handlers

  return (
    <SubPage title="Display" onBack={onBack}>
      <div className="ps-rows">
        <div className="ps-row">
          <span className="ps-label">Font size</span>
          <div className="ps-seg">
            {['small', 'medium', 'large'].map(v => (
              <button key={v}
                className={`ps-seg-btn${settings.fontSize === v ? ' active' : ''}`}
                onClick={() => onSettingChange('fontSize', v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="ps-row">
          <span className="ps-label">Theme</span>
          <div className="ps-seg">
            {['light', 'dark', 'system'].map(v => (
              <button key={v}
                className={`ps-seg-btn${settings.theme === v ? ' active' : ''}`}
                onClick={() => onSettingChange('theme', v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="ps-row">
          <span className="ps-label">Display mode</span>
          <div className="ps-seg">
            {['basic', 'compact', 'deck'].map(v => (
              <button key={v}
                className={`ps-seg-btn${settings.cardMode === v ? ' active' : ''}`}
                onClick={() => onSettingChange('cardMode', v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="ps-row">
          <div className="ps-row-label">
            <span className="ps-label">Smart measurements</span>
            <span className="ps-desc">Scale oz → lb, tsp → tbsp → cup, etc.</span>
          </div>
          <button
            className={`toggle-btn${settings.smartUnits ? ' on' : ''}`}
            onClick={() => onSettingChange('smartUnits', !settings.smartUnits)}
            role="switch" aria-checked={settings.smartUnits}>
            <span className="toggle-knob" />
          </button>
        </div>
      </div>
    </SubPage>
  )
}

/* ── App Info sub-page ───────────────────────────────────────────── */
function AppInfoPage({ pwa, onBack }) {
  const { updateAvailable, onApplyUpdate, onCheckUpdate } = pwa
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState(null)

  async function handleCheck() {
    setChecking(true); setCheckResult(null)
    await onCheckUpdate()
    setTimeout(() => {
      setChecking(false)
      setCheckResult('none-found')
      setTimeout(() => setCheckResult(null), 4000)
    }, 2000)
  }

  return (
    <SubPage title="App info" onBack={onBack}>
      <div className="ps-rows">
        <div className="ps-row">
          <span className="ps-label">Version</span>
          <span className="ps-value">{APP_VERSION}</span>
        </div>
        <div className="ps-row">
          <span className="ps-label">Updates</span>
          <div className="ps-update-group">
            {updateAvailable
              ? <button className="btn-primary btn-sm" onClick={onApplyUpdate}>Reload to update</button>
              : <button className="settings-action-btn" onClick={handleCheck} disabled={checking}>
                  {checking ? 'Checking…' : 'Check for update'}
                </button>
            }
            {checkResult === 'none-found' && !updateAvailable && (
              <span className="ps-update-result">No update found</span>
            )}
          </div>
        </div>
      </div>
    </SubPage>
  )
}
