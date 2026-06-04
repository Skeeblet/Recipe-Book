import { parseNotesToArray } from './parseNotes.js'

export function generateShareText(recipe) {
  const statsLine = recipe.stats.map(s => `${s.value} ${s.label}`).join(' · ')
  const header = [recipe.servingLabel, statsLine].filter(Boolean).join(' | ')
  const ingredients = recipe.ingredients.map(i => `- ${i.amount} ${i.name}`.trim()).join('\n')
  const steps = recipe.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')

  const notesArr = parseNotesToArray(recipe.notes).filter(n => n.title || n.body)
  const notesText = notesArr.map(n => n.title ? `${n.title}: ${n.body}` : n.body).join('\n')

  const url = `https://skeeblet.github.io/Recipe-Book/?recipe=${recipe.id}`
  const parts = [recipe.title, header, 'Ingredients:\n' + ingredients, 'Steps:\n' + steps]
  if (notesText) parts.push('Notes:\n' + notesText)
  parts.push('Share link: ' + url)
  return parts.join('\n\n')
}

// Pass a no-op for showToast if the caller wants to suppress the internal "Copied!" toast
export async function shareRecipe(recipe, showToast) {
  const text = generateShareText(recipe)
  const url = `https://skeeblet.github.io/Recipe-Book/?recipe=${recipe.id}`
  if (navigator.share) {
    try { await navigator.share({ title: recipe.title, text, url }) } catch (e) { /* user cancelled */ }
  } else {
    await navigator.clipboard.writeText(text)
    showToast('Copied!')
  }
}
