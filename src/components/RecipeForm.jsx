import { useState } from 'react'
import { COLOR_PALETTE } from '../hooks/useTags.js'

const STAT_COLORS = [
  { value: '',       label: 'Orange (default)' },
  { value: 'green',  label: 'Green' },
  { value: 'blue',   label: 'Blue' },
  { value: 'yellow', label: 'Yellow' },
]

function emptyForm() {
  return {
    title: '',
    description: '',
    tags: [],
    servingLabel: '1 serving',
    stats: [
      { value: '', label: 'Cal',     colorClass: '' },
      { value: '', label: 'Protein', colorClass: 'green' },
      { value: '', label: 'Fiber',   colorClass: 'blue' },
      { value: '', label: 'Fat',     colorClass: 'yellow' },
    ],
    ingredients: [{ name: '', amount: '' }],
    steps: [''],
    notes: '',
  }
}

function recipeToForm(recipe) {
  return {
    title:       recipe.title,
    description: recipe.description,
    category:    recipe.category,
    tags:        [...recipe.tags],
    servingLabel: recipe.servingLabel,
    stats:       recipe.stats.map(s => ({ ...s })),
    ingredients: recipe.ingredients.map(i => ({ ...i })),
    steps:       [...recipe.steps],
    notes:       recipe.notes || '',
  }
}

export default function RecipeForm({ recipe, allTags, onAddTag, onSubmit, onClose }) {
  const [form, setForm] = useState(recipe ? recipeToForm(recipe) : emptyForm())
  const [newTagLabel, setNewTagLabel] = useState('')
  const [newTagColor, setNewTagColor] = useState(COLOR_PALETTE[0])
  const [addingTag, setAddingTag] = useState(false)

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleTag(tag) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))
  }

  function handleCreateTag() {
    if (!newTagLabel.trim()) return
    const slug = onAddTag(newTagLabel, newTagColor)
    if (slug && !form.tags.includes(slug)) toggleTag(slug)
    setNewTagLabel('')
    setNewTagColor(COLOR_PALETTE[0])
    setAddingTag(false)
  }

  function handleCancelNewTag() {
    setNewTagLabel('')
    setNewTagColor(COLOR_PALETTE[0])
    setAddingTag(false)
  }

  function setIngredient(i, field, value) {
    setForm(f => {
      const ingredients = [...f.ingredients]
      ingredients[i] = { ...ingredients[i], [field]: value }
      return { ...f, ingredients }
    })
  }
  function addIngredient() { setForm(f => ({ ...f, ingredients: [...f.ingredients, { name: '', amount: '' }] })) }
  function removeIngredient(i) { setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) })) }

  function setStep(i, value) {
    setForm(f => { const steps = [...f.steps]; steps[i] = value; return { ...f, steps } })
  }
  function addStep() { setForm(f => ({ ...f, steps: [...f.steps, ''] })) }
  function removeStep(i) { setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) })) }

  function setStat(i, field, value) {
    setForm(f => { const stats = [...f.stats]; stats[i] = { ...stats[i], [field]: value }; return { ...f, stats } })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      ...form,
      ingredients: form.ingredients.filter(ing => ing.name.trim()),
      steps:       form.steps.filter(s => s.trim()),
    })
  }

  const previewSlug = newTagLabel.trim()
    ? newTagLabel.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{recipe ? 'Edit Recipe' : 'Add Recipe'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            <div className="form-group">
              <label>Recipe name *</label>
              <input type="text" value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="e.g. Greek Chicken Bowl" required />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input type="text" value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="Brief description of the recipe" />
            </div>

            {/* Unified tag picker */}
            <div className="form-group">
              <label>Tags</label>
              <div className="tag-picker">
                {allTags.map(({ tag, label, color }) => {
                  const selected = form.tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-pill${selected ? ' selected' : ''}`}
                      style={selected
                        ? { background: color.bg, color: color.text, borderColor: color.text }
                        : { background: 'transparent', color: color.text, borderColor: color.bg }
                      }
                      onClick={() => toggleTag(tag)}
                    >
                      {label}
                    </button>
                  )
                })}

                {!addingTag && (
                  <button
                    type="button"
                    className="tag-pill add-tag-pill"
                    onClick={() => setAddingTag(true)}
                  >
                    + New tag
                  </button>
                )}
              </div>

              {addingTag && (
                <div className="new-tag-inline">
                  <div className="new-tag-preview-row">
                    {previewSlug
                      ? <span className="tag-pill selected" style={{ background: newTagColor.bg, color: newTagColor.text, borderColor: newTagColor.text }}>
                          {newTagLabel.trim()}
                        </span>
                      : <span className="new-tag-placeholder">Tag preview</span>
                    }
                    <input
                      autoFocus
                      type="text"
                      className="new-tag-input"
                      placeholder="Tag name..."
                      value={newTagLabel}
                      onChange={e => setNewTagLabel(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleCreateTag() }
                        if (e.key === 'Escape') handleCancelNewTag()
                      }}
                    />
                  </div>
                  <div className="color-swatches">
                    {COLOR_PALETTE.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`color-swatch${newTagColor === c ? ' selected' : ''}`}
                        style={{ background: c.bg, borderColor: newTagColor === c ? c.text : 'transparent' }}
                        title={`Color ${i + 1}`}
                        onClick={() => setNewTagColor(c)}
                      />
                    ))}
                  </div>
                  <div className="new-tag-actions">
                    <button type="button" className="btn-secondary btn-sm" onClick={handleCancelNewTag}>Cancel</button>
                    <button type="button" className="btn-primary btn-sm" onClick={handleCreateTag} disabled={!newTagLabel.trim()}>
                      Create tag
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Serving label</label>
              <input type="text" value={form.servingLabel}
                onChange={e => setField('servingLabel', e.target.value)}
                placeholder="e.g. 6 portions, per jar, 1 serving" />
            </div>

            <div className="form-group">
              <label>Stats (value + label + color)</label>
              {form.stats.map((stat, i) => (
                <div key={i} className="stat-row">
                  <input type="text" placeholder="Value (e.g. 385)" value={stat.value}
                    onChange={e => setStat(i, 'value', e.target.value)} />
                  <input type="text" placeholder="Label (e.g. Cal)" value={stat.label}
                    onChange={e => setStat(i, 'label', e.target.value)} />
                  <select value={stat.colorClass} onChange={e => setStat(i, 'colorClass', e.target.value)}>
                    {STAT_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label>Ingredients</label>
              {form.ingredients.map((ing, i) => (
                <div key={i} className="ingredient-row">
                  <input type="text" placeholder="Ingredient name" value={ing.name}
                    onChange={e => setIngredient(i, 'name', e.target.value)} />
                  <input type="text" placeholder="Amount" value={ing.amount}
                    onChange={e => setIngredient(i, 'amount', e.target.value)} className="amount-input" />
                  {form.ingredients.length > 1 && (
                    <button type="button" className="remove-btn" onClick={() => removeIngredient(i)}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="add-row-btn" onClick={addIngredient}>+ Add ingredient</button>
            </div>

            <div className="form-group">
              <label>Steps</label>
              {form.steps.map((step, i) => (
                <div key={i} className="step-row">
                  <span className="step-row-num">{i + 1}</span>
                  <textarea rows={2} value={step} onChange={e => setStep(i, e.target.value)}
                    placeholder={`Step ${i + 1}...`} />
                  {form.steps.length > 1 && (
                    <button type="button" className="remove-btn" onClick={() => removeStep(i)}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="add-row-btn" onClick={addStep}>+ Add step</button>
            </div>

            <div className="form-group">
              <label>Notes & tips</label>
              <textarea rows={3} value={form.notes} onChange={e => setField('notes', e.target.value)}
                placeholder="Separate tips with ' | ' (e.g. Tip 1: text | Tip 2: text)" />
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{recipe ? 'Save changes' : 'Add recipe'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
