import { useState } from 'react'
import { parseNotesToArray } from '../utils/parseNotes.js'

const TEMPLATE = JSON.stringify({
  title: "Recipe Name",
  description: "Brief description",
  tags: ["breakfast", "high-protein"],
  servingLabel: "4 portions",
  stats: [
    { label: "Cal",     value: "400", colorClass: "" },
    { label: "Protein", value: "30g", colorClass: "green" },
    { label: "Fiber",   value: "8g",  colorClass: "blue" },
    { label: "Fat",     value: "12g", colorClass: "yellow" }
  ],
  ingredients: [
    { amount: "1 cup", name: "Ingredient name" },
    { amount: "½ tbsp", name: "Another ingredient" },
    { amount: "", name: "Ingredient with no amount" }
  ],
  steps: [
    "First step goes here.",
    "Second step goes here."
  ],
  notes: "Tip label: tip text | Another tip: more text"
}, null, 2)

function validateRecipe(obj) {
  if (!obj || typeof obj !== 'object') return 'JSON must be an object.'
  if (!obj.title || typeof obj.title !== 'string' || !obj.title.trim()) return '"title" is required.'
  return null
}

export default function ImportRecipeModal({ allTags, onAddTag, onImport, onClose }) {
  const [text, setText] = useState(TEMPLATE)
  const [error, setError] = useState('')

  function handleImport() {
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      setError('Invalid JSON: ' + e.message)
      return
    }

    const validationError = validateRecipe(parsed)
    if (validationError) { setError(validationError); return }

    // Resolve tags: match existing by label/slug, create unknown ones
    const rawTags = Array.isArray(parsed.tags) ? parsed.tags : []
    const resolvedTags = rawTags.map(t => {
      const exists = allTags.find(at => at.tag === t || at.label.toLowerCase() === t.toLowerCase())
      if (exists) return exists.tag
      return onAddTag(t) || t
    })

    onImport({
      title:        parsed.title,
      description:  parsed.description  || '',
      tags:         resolvedTags,
      servingLabel: parsed.servingLabel || '1 serving',
      stats:        Array.isArray(parsed.stats)       ? parsed.stats       : [],
      ingredients:  Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      steps:        Array.isArray(parsed.steps)       ? parsed.steps       : [],
      notes:        parseNotesToArray(parsed.notes),
      isUserAdded:  true,
    })
  }

  function handleCopy() {
    navigator.clipboard.writeText(TEMPLATE).catch(() => {})
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal import-modal">
        <div className="modal-header">
          <h2>Import Recipe</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="import-hint">
            Paste recipe JSON below, or copy the template and give it to an AI to fill in.
          </p>
          <textarea
            className="import-textarea"
            value={text}
            onChange={e => { setText(e.target.value); setError('') }}
            spellCheck={false}
          />
          {error && <div className="import-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={handleCopy}>Copy template</button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleImport}>Import</button>
        </div>
      </div>
    </div>
  )
}
