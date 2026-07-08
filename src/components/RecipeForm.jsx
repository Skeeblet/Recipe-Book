import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { COLOR_PALETTE } from '../hooks/useTags.js'
import { parseNotesToArray } from '../utils/parseNotes.js'
import { callAI, extractJson } from '../utils/aiClient.js'
import { normalizeImportedRecipe } from '../utils/importRecipe.js'
import { buildModifyPrompt } from '../utils/recipeAI.js'

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
    </svg>
  )
}

function AutoExpandTextarea({ value, onChange, ...props }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return <textarea ref={ref} value={value} onChange={onChange} {...props} />
}

function parseTimeToFormState(str) {
  if (!str) return { hours: 0, minutes: 0 }
  const s = str.toLowerCase()
  let hours = 0, minutes = 0
  const hrMatch = s.match(/(\d+(?:\.\d+)?)\s*h/)
  if (hrMatch) {
    const val = parseFloat(hrMatch[1])
    hours = Math.floor(val)
    minutes = Math.round((val % 1) * 60)
  }
  const minMatch = s.match(/(\d+)\s*m/)
  if (minMatch) minutes = parseInt(minMatch[1])
  return { hours, minutes }
}

function formatEstimatedTime({ hours, minutes }) {
  if (!hours && !minutes) return ''
  if (hours && minutes) return `${hours} hr ${minutes} min`
  if (hours) return `${hours} hr`
  return `${minutes} min`
}

const HOUR_OPTIONS   = [0, 1, 2, 3, 4, 5]
const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

const PRESET_LABELS = ['Cal', 'Protein', 'Fiber', 'Fat', 'Carbs', 'Sodium']

const LEGACY_STAT_COLORS = {
  '':       { bg: '#F2E4D8', text: '#D4622A' },
  'green':  { bg: '#EAF0E8', text: '#4A6741' },
  'blue':   { bg: '#E0EEF7', text: '#1A5F8A' },
  'yellow': { bg: '#FDF6E3', text: '#B5860D' },
}

const DEFAULT_STATS = [
  { value: '', label: 'Cal',     color: { bg: '#F2E4D8', text: '#D4622A' } },
  { value: '', label: 'Protein', color: { bg: '#EDE6F7', text: '#7B5EA7' } },
  { value: '', label: 'Fiber',   color: { bg: '#EAF0E8', text: '#4A6741' } },
  { value: '', label: 'Fat',     color: { bg: '#FDF6E3', text: '#B5860D' } },
]

function defaultStats() {
  return DEFAULT_STATS.map(s => ({ ...s, color: { ...s.color } }))
}

// The stat rows have no add/remove controls — the form relies on the preset
// rows always being present. Recipes with missing or partial stats (imports,
// AI drafts) get the absent presets appended as blank rows so nutrition is
// always editable; blank rows are filtered back out on submit.
function statsToForm(recipeStats = []) {
  const mapped = recipeStats.map(s => ({
    value: s.value,
    label: s.label,
    color: s.color || LEGACY_STAT_COLORS[s.colorClass || ''] || LEGACY_STAT_COLORS[''],
  }))
  const norm = l => {
    const lower = String(l || '').trim().toLowerCase()
    return lower === 'calories' ? 'cal' : lower
  }
  const missing = defaultStats().filter(d => !mapped.some(m => norm(m.label) === norm(d.label)))
  return [...mapped, ...missing]
}

function emptyForm() {
  return {
    title: '',
    description: '',
    tags: [],
    servingLabel: '1 serving',
    stats: defaultStats(),
    ingredients: [{ name: '', amount: '' }],
    steps: [''],
    notes: [{ title: '', body: '' }],
    estimatedTime: { hours: 0, minutes: 0 },
  }
}

function recipeToForm(recipe) {
  return {
    title:       recipe.title,
    description: recipe.description,
    category:    recipe.category,
    tags:        [...recipe.tags],
    servingLabel: recipe.servingLabel,
    stats:       statsToForm(recipe.stats),
    ingredients: recipe.ingredients.map(i => ({ ...i })),
    steps:       [...recipe.steps],
    notes:       parseNotesToArray(recipe.notes),
    estimatedTime: parseTimeToFormState(recipe.estimatedTime),
  }
}

export default function RecipeForm({ recipe, allTags, onAddTag, onSubmit, onClose, recipes = [], settings }) {
  const [form, setForm] = useState(recipe ? recipeToForm(recipe) : emptyForm())
  const [errors, setErrors] = useState({})
  const [newTagLabel, setNewTagLabel] = useState('')
  const [newTagColor, setNewTagColor] = useState(COLOR_PALETTE[0])
  const [addingTag, setAddingTag] = useState(false)
  const [openColorPicker, setOpenColorPicker] = useState(null)

  // AI "change something" — modifies the whole recipe in place before saving
  const [aiOpen, setAiOpen] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')
  const aiAbortRef = useRef(null)
  const aiReqId = useRef(0)
  const canUseAI = !!settings?.aiApiKey

  useEffect(() => () => { if (aiAbortRef.current) aiAbortRef.current.abort() }, [])

  async function runAiModify() {
    const instruction = aiText.trim()
    if (!instruction) { setAiError('Describe what to change first.'); return }
    const id = ++aiReqId.current
    const controller = new AbortController()
    aiAbortRef.current = controller
    setAiBusy(true)
    setAiError('')
    // Current form → plain recipe for the prompt (drops UI-only shapes)
    const current = {
      title: form.title,
      description: form.description,
      servingLabel: form.servingLabel,
      estimatedTime: formatEstimatedTime(form.estimatedTime),
      ingredients: form.ingredients.filter(i => i.name.trim()),
      steps: form.steps.filter(s => s.trim()),
      stats: form.stats.filter(s => String(s.value ?? '').trim()).map(s => ({ label: s.label, value: s.value })),
      notes: form.notes.filter(n => n.title.trim() || n.body.trim()),
    }
    try {
      const text = await callAI(buildModifyPrompt(current, instruction), settings, null, controller.signal)
      if (id !== aiReqId.current) return
      const json = extractJson(text)
      if (json.error) throw new Error(json.message || "The AI couldn't apply that change. Try rewording it.")
      // Keep the user's chosen tags; AI edits the recipe content only
      const converted = recipeToForm(normalizeImportedRecipe(json))
      setForm(f => ({ ...converted, tags: f.tags }))
      setAiText('')
      setAiOpen(false)
    } catch (e) {
      if (e.name === 'AbortError' || id !== aiReqId.current) return
      setAiError(e.message)
    } finally {
      if (id === aiReqId.current) setAiBusy(false)
    }
  }

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

  function setNote(i, field, value) {
    setForm(f => { const notes = [...f.notes]; notes[i] = { ...notes[i], [field]: value }; return { ...f, notes } })
  }
  function addNote() { setForm(f => ({ ...f, notes: [...f.notes, { title: '', body: '' }] })) }
  function removeNote(i) { setForm(f => ({ ...f, notes: f.notes.filter((_, idx) => idx !== i) })) }

  function setStat(i, field, value) {
    setForm(f => { const stats = [...f.stats]; stats[i] = { ...stats[i], [field]: value }; return { ...f, stats } })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const newErrors = {}

    const titleLower = form.title.trim().toLowerCase()
    const duplicate = recipes.find(r =>
      r.title.trim().toLowerCase() === titleLower && r.id !== recipe?.id
    )
    if (duplicate) newErrors.title = 'You already have a recipe with this name.'

    const validIngredients = form.ingredients.filter(ing => ing.name.trim())
    if (!validIngredients.length) newErrors.ingredients = 'Add at least one ingredient.'

    const validSteps = form.steps.filter(s => s.trim())
    if (!validSteps.length) newErrors.steps = 'Add at least one instruction.'

    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    onSubmit({
      ...form,
      stats:         form.stats.filter(s => String(s.value ?? '').trim()),
      ingredients:   validIngredients,
      steps:         validSteps,
      notes:         form.notes.filter(n => n.title.trim() || n.body.trim()),
      estimatedTime: formatEstimatedTime(form.estimatedTime),
    })
  }

  const previewSlug = newTagLabel.trim()
    ? newTagLabel.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{recipe?.id ? 'Edit Recipe' : 'Add Recipe'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {canUseAI && (
              <div className="form-ai-modify">
                {aiOpen ? (
                  <>
                    <input
                      type="text"
                      className="form-ai-input"
                      value={aiText}
                      onChange={e => { setAiText(e.target.value); setAiError('') }}
                      placeholder="e.g. make it vegan, double the servings, add a garlic butter sauce"
                      disabled={aiBusy}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runAiModify() } }}
                    />
                    <div className="form-ai-actions">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        disabled={aiBusy}
                        onClick={() => { if (aiAbortRef.current) aiAbortRef.current.abort(); setAiOpen(false); setAiText(''); setAiError('') }}
                      >
                        Cancel
                      </button>
                      <button type="button" className="btn-primary btn-sm" onClick={runAiModify} disabled={aiBusy}>
                        {aiBusy ? 'Thinking…' : 'Apply'}
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="form-ai-btn" onClick={() => { setAiOpen(true); setAiError('') }}>
                    <SparkleIcon /> Ask AI to change something
                  </button>
                )}
                {aiError && <div className="import-error">{aiError}</div>}
              </div>
            )}

            <div className="form-group">
              <label>Recipe name *</label>
              <input type="text" value={form.title}
                onChange={e => { setField('title', e.target.value); setErrors(er => ({ ...er, title: null })) }}
                placeholder="e.g. Greek Chicken Bowl" required />
              {errors.title && <span className="form-error">{errors.title}</span>}
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
              <label>Estimated time</label>
              <div className="time-selector">
                <select
                  value={form.estimatedTime.hours}
                  onChange={e => setField('estimatedTime', { ...form.estimatedTime, hours: parseInt(e.target.value) })}
                >
                  {HOUR_OPTIONS.map(h => (
                    <option key={h} value={h}>{h} hr</option>
                  ))}
                </select>
                <select
                  value={form.estimatedTime.minutes}
                  onChange={e => setField('estimatedTime', { ...form.estimatedTime, minutes: parseInt(e.target.value) })}
                >
                  {MINUTE_OPTIONS.map(m => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Stats (color · value · label)</label>
              {form.stats.map((stat, i) => {
                const isCustom = !PRESET_LABELS.includes(stat.label)
                return (
                  <div key={i} className="stat-row">
                    <div className="stat-color-picker">
                      <button
                        type="button"
                        className="stat-color-btn"
                        style={{ background: stat.color.bg, borderColor: stat.color.text }}
                        onClick={() => setOpenColorPicker(openColorPicker === i ? null : i)}
                      />
                      {openColorPicker === i && (
                        <div className="stat-color-popup">
                          <div className="color-swatches">
                            {COLOR_PALETTE.map((c, ci) => (
                              <button
                                key={ci}
                                type="button"
                                className={`color-swatch${stat.color.bg === c.bg ? ' selected' : ''}`}
                                style={{ background: c.bg, borderColor: stat.color.bg === c.bg ? c.text : 'transparent' }}
                                title={`Color ${ci + 1}`}
                                onClick={() => { setStat(i, 'color', c); setOpenColorPicker(null) }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      className="stat-value-input"
                      placeholder="385"
                      value={stat.value}
                      onChange={e => setStat(i, 'value', e.target.value)}
                    />
                    <div className="stat-label-area">
                      <select
                        value={isCustom ? 'Custom' : stat.label}
                        onChange={e => setStat(i, 'label', e.target.value === 'Custom' ? '' : e.target.value)}
                      >
                        {PRESET_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                        <option value="Custom">Custom</option>
                      </select>
                      {isCustom && (
                        <input
                          type="text"
                          placeholder="Label"
                          value={stat.label}
                          onChange={e => setStat(i, 'label', e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="form-group">
              <label>Ingredients</label>
              {form.ingredients.map((ing, i) => (
                <div key={i} className="ingredient-row">
                  <input type="text" placeholder="Ingredient name" value={ing.name} required={i === 0}
                    onChange={e => setIngredient(i, 'name', e.target.value)} />
                  <input type="text" placeholder="Amount" value={ing.amount}
                    onChange={e => setIngredient(i, 'amount', e.target.value)} className="amount-input" />
                  {form.ingredients.length > 1 && (
                    <button type="button" className="remove-btn" onClick={() => removeIngredient(i)}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="add-row-btn" onClick={() => { addIngredient(); setErrors(er => ({ ...er, ingredients: null })) }}>+ Add ingredient</button>
              {errors.ingredients && <span className="form-error">{errors.ingredients}</span>}
            </div>

            <div className="form-group">
              <label>Steps</label>
              {form.steps.map((step, i) => (
                <div key={i} className="step-row">
                  <span className="step-row-num">{i + 1}</span>
                  <AutoExpandTextarea
                    className="auto-expand"
                    rows={1}
                    value={step}
                    onChange={e => setStep(i, e.target.value)}
                    placeholder={`Step ${i + 1}...`}
                    required={i === 0}
                  />
                  {form.steps.length > 1 && (
                    <button type="button" className="remove-btn" onClick={() => removeStep(i)}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="add-row-btn" onClick={() => { addStep(); setErrors(er => ({ ...er, steps: null })) }}>+ Add step</button>
              {errors.steps && <span className="form-error">{errors.steps}</span>}
            </div>

            <div className="form-group">
              <label>Notes & tips</label>
              {form.notes.map((note, i) => (
                <div key={i} className="note-row">
                  <div className="note-fields">
                    <input type="text" className="note-title-input" placeholder="Tip title (optional)"
                      value={note.title} onChange={e => setNote(i, 'title', e.target.value)} />
                    <AutoExpandTextarea
                      className="auto-expand"
                      rows={1}
                      placeholder="Tip text..."
                      value={note.body}
                      onChange={e => setNote(i, 'body', e.target.value)}
                    />
                  </div>
                  {form.notes.length > 1 && (
                    <button type="button" className="remove-btn" onClick={() => removeNote(i)}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="add-row-btn" onClick={addNote}>+ Add another tip</button>
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{recipe?.id ? 'Save changes' : 'Add recipe'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
