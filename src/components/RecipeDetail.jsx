import { useEffect, useState } from 'react'
import { scaleAmount, parseServingBase, parseServingUnit } from '../utils/scaleAmount.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import AIToolsModal from './AIToolsModal.jsx'

export default function RecipeDetail({
  recipe, allTags, onBack, onPrint, onEdit, onDelete, isPrinting,
  onAddIngredients, onAddItem, groceryNames = new Set(), smartUnits,
  onShare, isSharedView, existingTitles = [], authUser, onSignIn, onAddToMyRecipes,
  settings, onApplyAIUpdate, onOpenAccount,
}) {
  const baseServings = parseServingBase(recipe.servingLabel)
  const servingUnit  = parseServingUnit(recipe.servingLabel)
  const [servings, setServings] = useState(baseServings)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [sharedName, setSharedName] = useState(recipe.title)
  const [aiMode, setAiMode] = useState(null) // null | 'optimize' | 'nutrition'
  const scaleFactor = baseServings > 0 ? servings / baseServings : 1

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onBack() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onBack])

  const notesArr = (() => {
    const raw = recipe.notes
    if (!raw || (Array.isArray(raw) && raw.length === 0)) return []
    if (Array.isArray(raw)) return raw
    return raw.split(' | ').filter(Boolean).map(part => {
      const colonIdx = part.indexOf(':')
      return (colonIdx > 0 && colonIdx < 30)
        ? { title: part.slice(0, colonIdx).trim(), body: part.slice(colonIdx + 1).trim() }
        : { title: '', body: part.trim() }
    })
  })()

  function scaleIng(ing) {
    return { ...ing, amount: scaleAmount(ing.amount, scaleFactor, smartUnits) }
  }

  return (
    <div className={`detail-overlay${isPrinting ? ' printing' : ''}`}>
      <div className="detail-topbar">
        <button className="detail-back-btn" onClick={onBack}>← Back</button>
        <div className="detail-topbar-title">
          <span className="detail-topbar-name">{recipe.title}</span>
        </div>
        <div className="detail-topbar-actions">
          <button className="action-btn share-btn action-btn--icon" title="Share recipe" onClick={onShare}>
            <svg viewBox="0 0 22 22" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="17" cy="5" r="2" />
              <circle cx="5" cy="11" r="2" />
              <circle cx="17" cy="17" r="2" />
              <line x1="7" y1="10" x2="15" y2="6" />
              <line x1="7" y1="12" x2="15" y2="16" />
            </svg>
          </button>
          <button className="action-btn print-btn action-btn--icon" title="Print recipe" onClick={onPrint}>
            <svg viewBox="0 0 22 22" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6,8 6,2 16,2 16,8" />
              <rect x="2" y="8" width="18" height="9" rx="2" />
              <rect x="6" y="14" width="10" height="6" rx="1" />
              <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
          {(() => {
            const allAdded = recipe.ingredients.length > 0 &&
              recipe.ingredients.every(ing => groceryNames.has(ing.name.toLowerCase()))
            return (
              <button
                className={`action-btn list-btn${allAdded ? ' list-btn--added' : ''}`}
                onClick={() => { if (!allAdded) onAddIngredients(recipe) }}
              >
                {allAdded ? '✓ List' : '+ List'}
              </button>
            )
          })()}
          <button className="action-btn edit-btn" onClick={onEdit}>Edit</button>
          {recipe.isUserAdded && (
            <button className="action-btn delete-btn" onClick={() => setConfirmDelete(true)}>Delete</button>
          )}
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-hero">
          <div className="detail-hero-left">
            <h1 className="detail-title">{recipe.title}</h1>
            <p className="detail-desc">{recipe.description}</p>
            <div className="recipe-tags" style={{ marginTop: 12 }}>
              {[...recipe.tags].sort((a, b) => {
                const la = allTags.find(t => t.tag === a)?.label ?? a
                const lb = allTags.find(t => t.tag === b)?.label ?? b
                return la.localeCompare(lb)
              }).map(tag => {
                const def = allTags.find(t => t.tag === tag)
                if (!def) return null
                return (
                  <span key={tag} className="rtag" style={{ background: def.color.bg, color: def.color.text }}>
                    {def.label}
                  </span>
                )
              })}
            </div>
            {recipe.estimatedTime && (
              <div className="recipe-time-badge" style={{ marginTop: 10 }}>⏱ {recipe.estimatedTime}</div>
            )}
          </div>
          <div className="detail-stats">
            {recipe.stats.filter(s => s.value?.toString().trim()).map((stat, i) => (
              <div key={i}
                className={`stat stat-large${!stat.color && stat.colorClass ? ' ' + stat.colorClass : ''}`}
                style={stat.color ? { background: stat.color.bg } : {}}
              >
                <span className="stat-val" style={stat.color ? { color: stat.color.text } : {}}>{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {!isSharedView && (
          <div className="detail-ai-row">
            <button className="ai-tool-btn" onClick={() => setAiMode('optimize')}>
              <SparkleIcon /> Optimize ingredients
            </button>
            <button className="ai-tool-btn" onClick={() => setAiMode('nutrition')}>
              <ScaleIcon /> Nutrition check
            </button>
          </div>
        )}

        <div className="detail-body">
          <div className="detail-col">
            <div className="section-title serving-title-row">
              <span>Ingredients</span>
              <div className="serving-controls">
                <button className="serving-btn" onClick={() => setServings(s => Math.max(1, s - 1))} disabled={servings <= 1}>−</button>
                <span className="serving-count">{servings} {servingUnit}</span>
                <button className="serving-btn" onClick={() => setServings(s => s + 1)}>+</button>
              </div>
            </div>
            <ul className="ingredient-list">
              {recipe.ingredients.map((ing, i) => {
                const scaled = scaleIng(ing)
                return (
                  <li key={i}>
                    <span className="ing-name">{scaled.name}</span>
                    <span className="ing-amount">{scaled.amount}</span>
                    <button
                      className={`ing-add-btn${groceryNames.has(scaled.name.toLowerCase()) ? ' ing-add-btn--added' : ''}`}
                      title={groceryNames.has(scaled.name.toLowerCase()) ? 'In grocery list' : 'Add to grocery list'}
                      onClick={() => { if (!groceryNames.has(scaled.name.toLowerCase())) onAddItem(scaled.name, scaled.amount, recipe.title) }}
                    >{groceryNames.has(scaled.name.toLowerCase()) ? '✓' : '+'}</button>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="detail-col">
            <div className="section-title">Instructions</div>
            <ol className="steps-list">
              {recipe.steps.map((step, i) => (
                <li key={i}>
                  <div className="step-num">{i + 1}</div>
                  <div>{step}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {notesArr.length > 0 && (
          <div className="notes-box detail-notes">
            <div className="notes-title">Notes & tips</div>
            <div className="notes-content notes-structured">
              {notesArr.map((note, i) => (
                <div key={i} className="notes-item notes-item-block">
                  {note.title && <strong>{note.title}: </strong>}
                  {note.body}
                </div>
              ))}
            </div>
          </div>
        )}

        {isSharedView && (
          <div className="shared-recipe-cta">
            {authUser ? (
              <>
                <div className="shared-name-row">
                  <label className="shared-name-label">Save as</label>
                  <input
                    type="text"
                    className="shared-name-input"
                    value={sharedName}
                    onChange={e => setSharedName(e.target.value)}
                  />
                </div>
                {existingTitles.includes(sharedName.trim().toLowerCase()) && (
                  <p className="shared-name-warning">You already have a recipe with this name.</p>
                )}
                <button
                  className="btn-primary shared-add-btn"
                  onClick={() => onAddToMyRecipes(sharedName.trim())}
                  disabled={!sharedName.trim() || existingTitles.includes(sharedName.trim().toLowerCase())}
                >
                  Add to my Recipe Box
                </button>
              </>
            ) : (
              <div className="shared-signin-prompt">
                <p>Sign in to save this recipe to your collection.</p>
                <button className="auth-btn" onClick={onSignIn}>Sign in with Google</button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`Delete "${recipe.title}"? This cannot be undone.`}
          onConfirm={() => { onDelete(); onBack() }}
          onCancel={() => setConfirmDelete(false)}
          centered
        />
      )}

      {aiMode && (
        <AIToolsModal
          mode={aiMode}
          recipe={recipe}
          settings={settings}
          onApply={patch => { onApplyAIUpdate(patch); setAiMode(null) }}
          onClose={() => setAiMode(null)}
          onOpenAccount={() => { setAiMode(null); onOpenAccount() }}
        />
      )}
    </div>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
    </svg>
  )
}

function ScaleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18" />
      <path d="M12 4v3" />
      <path d="M5 20a7 7 0 0 1 14 0" />
      <circle cx="12" cy="4" r="1.5" />
    </svg>
  )
}
