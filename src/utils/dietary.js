import { callAI, extractJson } from './aiClient.js'

export const DIETARY_PRESETS = [
  'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Egg-free',
  'Nut-free', 'Soy-free', 'Shellfish-free', 'Kosher', 'Halal', 'Low-sodium',
  'Low-carb / Keto', 'Low-FODMAP',
]

const RESPONSE_RULES = 'Return ONLY valid JSON — no markdown, no code fences, no preamble, no explanation.'

const norm = s => String(s || '').trim().toLowerCase()

export function formatRestrictions(restrictions = []) {
  return restrictions.join(', ')
}

// Appended to the "Create with AI" prompt so the recipe is compliant from the start.
export function dietaryPromptAddendum(restrictions = []) {
  if (!restrictions.length) return ''
  return `\nThe user has these dietary restrictions: ${formatRestrictions(restrictions)}. The recipe MUST comply with every one of them — choose compliant ingredients from the start rather than substituting afterwards.`
}

export function buildDietaryCheckPrompt(recipe, restrictions = []) {
  const ingredients = JSON.stringify(
    (recipe.ingredients || []).map(i => ({ name: i.name, amount: i.amount || '' }))
  )
  return `Check this recipe's ingredients against the user's dietary restrictions.

Dietary restrictions: ${formatRestrictions(restrictions)}

Recipe: ${recipe.title || '(untitled)'}
Ingredients (JSON):
${ingredients}

Rules:
- List EVERY ingredient that violates ANY of the restrictions. Consider hidden sources too (e.g. butter for dairy-free, fish sauce for vegetarian, soy sauce for gluten-free).
- "ingredient" must be the exact "name" string from the list above.
- For each conflict propose one practical substitute that keeps the dish recognizable and satisfies ALL the restrictions. Use realistic amounts in the same style as the list; leave "amount" empty to keep the original amount.
- If nothing conflicts, return an empty "conflicts" array.

${RESPONSE_RULES}
Schema:
{
  "conflicts": [
    {
      "ingredient": "exact name from the list",
      "restriction": "which restriction it violates",
      "reason": "short explanation",
      "substitute": { "name": "string", "amount": "string" }
    }
  ]
}`
}

// -> [{ index, ingredient, restriction, reason, substitute: { name, amount } }]
// Rows that don't match a real ingredient (by normalized name) are dropped so
// the UI only ever offers swaps for ingredients that exist.
export function parseDietaryCheckResponse(json, ingredients = []) {
  if (!json || typeof json !== 'object') return []
  if (json.error) throw new Error(json.message || 'The AI returned something unexpected. Try again.')
  const rows = Array.isArray(json.conflicts) ? json.conflicts : []
  const seen = new Set()
  const out = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const name = norm(row.ingredient)
    if (!name) continue
    let index = ingredients.findIndex(i => norm(i.name) === name)
    if (index === -1) index = ingredients.findIndex(i => norm(i.name).includes(name) || name.includes(norm(i.name)))
    if (index === -1 || seen.has(index)) continue
    seen.add(index)
    const sub = row.substitute && typeof row.substitute === 'object' ? row.substitute : {}
    const subName = typeof sub.name === 'string' ? sub.name.trim() : ''
    out.push({
      index,
      ingredient: ingredients[index].name,
      amount: ingredients[index].amount || '',
      restriction: typeof row.restriction === 'string' ? row.restriction.trim() : '',
      reason: typeof row.reason === 'string' ? row.reason.trim() : '',
      substitute: subName
        ? { name: subName, amount: sub.amount == null ? '' : String(sub.amount).trim() }
        : null,
    })
  }
  return out.sort((a, b) => a.index - b.index)
}

// Resolves to [] when the feature can't run (no restrictions or no key).
export async function checkDietaryConflicts(recipe, settings, signal = null) {
  const restrictions = settings?.dietaryRestrictions || []
  if (!restrictions.length || !settings?.aiApiKey) return []
  if (!recipe?.ingredients?.length) return []
  const text = await callAI(buildDietaryCheckPrompt(recipe, restrictions), settings, null, signal)
  return parseDietaryCheckResponse(extractJson(text), recipe.ingredients)
}

// Returns a new ingredient list with the selected conflicts swapped for their
// substitutes. Conflicts without a substitute are removed when selected.
export function applySubstitutions(ingredients, conflicts, selectedIndexes) {
  const chosen = new Set(selectedIndexes)
  const byIndex = new Map(conflicts.filter(c => chosen.has(c.index)).map(c => [c.index, c]))
  const out = []
  ingredients.forEach((ing, i) => {
    const c = byIndex.get(i)
    if (!c) { out.push(ing); return }
    if (!c.substitute) return
    out.push({
      ...ing,
      name: c.substitute.name,
      amount: c.substitute.amount || ing.amount || '',
    })
  })
  return out
}
