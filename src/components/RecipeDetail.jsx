import { useEffect, useState } from 'react'
import { scaleAmount, parseServingBase, parseServingUnit } from '../utils/scaleAmount.js'
import ConfirmDialog from './ConfirmDialog.jsx'

export default function RecipeDetail({
  recipe, allTags, onBack, onPrint, onEdit, onDelete, isPrinting,
  onAddIngredients, onAddItem, smartUnits,
}) {
  const baseServings = parseServingBase(recipe.servingLabel)
  const servingUnit  = parseServingUnit(recipe.servingLabel)
  const [servings, setServings] = useState(baseServings)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const scaleFactor = baseServings > 0 ? servings / baseServings : 1

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onBack() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onBack])

  const notesParts = recipe.notes ? recipe.notes.split(' | ') : []

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
          <button className="action-btn print-btn" onClick={onPrint}>Print</button>
          <button className="action-btn list-btn" onClick={() => onAddIngredients(recipe)}>+ List</button>
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
              {recipe.tags.map(tag => {
                const def = allTags.find(t => t.tag === tag)
                if (!def) return null
                return (
                  <span key={tag} className="rtag" style={{ background: def.color.bg, color: def.color.text }}>
                    {def.label}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="detail-stats">
            {recipe.stats.map((stat, i) => (
              <div key={i} className={`stat stat-large${stat.colorClass ? ' ' + stat.colorClass : ''}`}>
                <span className="stat-val">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

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
                      className="ing-add-btn"
                      title="Add to grocery list"
                      onClick={() => onAddItem(scaled.name, scaled.amount, recipe.title)}
                    >+</button>
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

        {notesParts.length > 0 && (
          <div className="notes-box detail-notes">
            <div className="notes-title">Notes & tips</div>
            <div className="notes-content">
              {notesParts.map((part, i) => {
                const colonIdx = part.indexOf(':')
                if (colonIdx > -1 && colonIdx < 30) {
                  return (
                    <span key={i} className="notes-item">
                      <strong>{part.slice(0, colonIdx)}:</strong>{part.slice(colonIdx + 1)}
                    </span>
                  )
                }
                return <span key={i} className="notes-item">{part}</span>
              })}
            </div>
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
    </div>
  )
}
