import { statColorFor } from './importRecipe.js'
import { splitIngredientLine } from './schemaOrgRecipe.js'

const UNEXPECTED_MSG = 'The AI returned something unexpected. Try again.'
const RESPONSE_RULES = 'Return ONLY valid JSON — no markdown, no code fences, no preamble, no explanation.'

function ingredientLines(recipe) {
  return recipe.ingredients
    .map(i => `- ${i.amount ? i.amount + ' ' : ''}${i.name}`)
    .join('\n')
}

export function buildOptimizePrompt(recipe, goal) {
  // Show current ingredients in the same JSON shape the response must use —
  // combined "2 cups rice" lines teach the model to stuff amounts into "name".
  const currentIngredients = JSON.stringify(
    recipe.ingredients.map(i => ({ name: i.name, amount: i.amount || '' }))
  )
  return `Adjust this recipe's ingredients to meet this goal: ${goal}

Recipe: ${recipe.title}
Serves: ${recipe.servingLabel || '1 serving'}
Current ingredients (JSON):
${currentIngredients}

Rules:
- Keep the dish recognizable — substitute, remove, or adjust amounts only as the goal requires.
- Return the COMPLETE new ingredient list, including unchanged ingredients exactly as they are.
- Prefer specific real name-brand products when they meaningfully advance the goal — e.g. a specific whey isolate brand for maximum protein, a high-fiber tortilla brand like Ole Xtreme Wellness, a sugar-free sauce brand. Pick brands commonly available in US grocery stores, and stay generic when no brand offers a real advantage.
- Use realistic amounts in the same style as the current list.
- Quantities belong ONLY in "amount" — the "name" field must never contain a quantity or unit.
- Recompute per-serving nutrition for the modified recipe.

${RESPONSE_RULES}
Schema:
{
  "summary": "1-2 sentences describing what changed and why",
  "ingredients": [{ "name": "string", "amount": "string" }],
  "stats": [
    { "label": "Cal", "value": "420" },
    { "label": "Protein", "value": "32g" },
    { "label": "Fiber", "value": "6g" },
    { "label": "Fat", "value": "12g" }
  ]
}
If the goal cannot reasonably be applied to this recipe, return {"error": true, "message": "short reason"} instead.`
}

export function buildNutritionPrompt(recipe) {
  return `Estimate accurate per-serving nutrition for this recipe from its ingredients and amounts.

Recipe: ${recipe.title}
Serves: ${recipe.servingLabel || '1 serving'}
Ingredients:
${ingredientLines(recipe)}

Compute totals from the amounts, then divide by the number of servings.
${RESPONSE_RULES}
Schema: {"calories": "420", "fat": "12g", "fiber": "6g", "protein": "32g"}
If the ingredient list is too vague to estimate, return {"error": true, "message": "short reason"} instead.`
}

export function parseOptimizeResponse(json) {
  if (json.error) throw new Error(json.message || UNEXPECTED_MSG)
  const ingredients = (Array.isArray(json.ingredients) ? json.ingredients : [])
    .map(entry => {
      if (typeof entry === 'string') return splitIngredientLine(entry)
      if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string' || !entry.name.trim()) return null
      const name = entry.name.trim()
      const amount = entry.amount == null ? '' : String(entry.amount).trim()
      // The model sometimes embeds the quantity in the name ("2 cups rice",
      // amount empty) — split it back out into the amount field.
      if (!amount) return splitIngredientLine(name)
      return { name, amount }
    })
    .filter(i => i && i.name)
  if (ingredients.length === 0) throw new Error(UNEXPECTED_MSG)
  const stats = (Array.isArray(json.stats) ? json.stats : [])
    .filter(s => s && s.label && s.value != null && String(s.value).trim())
    .map(s => ({ label: String(s.label).trim(), value: String(s.value).trim() }))
  return {
    summary: typeof json.summary === 'string' ? json.summary.trim() : '',
    ingredients,
    stats,
  }
}

// -> [{label: 'Cal'|'Protein'|'Fiber'|'Fat', value}] in app display style
export function parseNutritionResponse(json) {
  if (json.error) throw new Error(json.message || UNEXPECTED_MSG)
  const fields = [['calories', 'Cal'], ['protein', 'Protein'], ['fiber', 'Fiber'], ['fat', 'Fat']]
  const stats = []
  for (const [key, label] of fields) {
    const raw = json[key]
    if (raw == null || !String(raw).trim()) continue
    let value = String(raw).trim().replace(/\s*k?cal(?:ories)?\s*$/i, '')
    if (key !== 'calories') {
      value = value.replace(/\s*grams?\s*$/i, 'g')
      if (/^\d+(\.\d+)?$/.test(value)) value += 'g'
    }
    stats.push({ label, value })
  }
  if (stats.length === 0) throw new Error(UNEXPECTED_MSG)
  return stats
}

const LABEL_ALIASES = {
  cal: 'cal', cals: 'cal', calories: 'cal', kcal: 'cal',
  protein: 'protein', fiber: 'fiber', fibre: 'fiber', fat: 'fat',
  carb: 'carbs', carbs: 'carbs', carbohydrates: 'carbs',
}

export function normalizeStatLabel(label) {
  const l = String(label || '').trim().toLowerCase()
  return LABEL_ALIASES[l] || l
}

// Merge AI stats into the recipe's existing stats: matching labels get the new
// value but keep their spelling and color; unmatched AI stats are appended with
// a default color; existing stats the AI didn't mention are left alone.
export function mergeStats(oldStats = [], aiStats = []) {
  const remaining = [...aiStats]
  const merged = oldStats.map(old => {
    const idx = remaining.findIndex(s => normalizeStatLabel(s.label) === normalizeStatLabel(old.label))
    if (idx === -1) return old
    const [next] = remaining.splice(idx, 1)
    return { ...old, value: next.value }
  })
  for (const next of remaining) {
    merged.push({ label: next.label, value: next.value, color: statColorFor(next.label) })
  }
  return merged
}

// Local, trustworthy diff for the review screen — never rely on the AI to
// describe its own changes.
export function diffIngredients(oldIngs = [], newIngs = []) {
  const norm = s => String(s || '').trim().toLowerCase()
  const oldByName = new Map(oldIngs.map(i => [norm(i.name), i]))
  const rows = newIngs.map(ing => {
    const old = oldByName.get(norm(ing.name))
    if (!old) return { ...ing, change: 'added' }
    oldByName.delete(norm(ing.name))
    if (norm(old.amount) !== norm(ing.amount)) return { ...ing, change: 'amount', oldAmount: old.amount }
    return { ...ing, change: 'same' }
  })
  const removed = [...oldByName.values()].map(ing => ({ ...ing, change: 'removed' }))
  return { rows, removed }
}
