import { parseNotesToArray } from './parseNotes.js'
import { splitIngredientLine } from './schemaOrgRecipe.js'

// Spec category enum -> app category slugs
const CATEGORY_MAP = {
  'breakfast': 'breakfast',
  'lunch & dinner': 'lunch-dinner',
  'lunch and dinner': 'lunch-dinner',
  'lunch': 'lunch',
  'dinner': 'dinner',
  'sauces': 'sauces',
  'snacks': 'snacks',
  'desserts': 'desserts',
}

// Same palette as RecipeForm's emptyForm() so imported cards render styled
const STAT_COLORS = {
  cal:      { bg: '#F2E4D8', text: '#D4622A' },
  calories: { bg: '#F2E4D8', text: '#D4622A' },
  protein:  { bg: '#EDE6F7', text: '#7B5EA7' },
  fiber:    { bg: '#EAF0E8', text: '#4A6741' },
  fat:      { bg: '#FDF6E3', text: '#B5860D' },
  carbs:    { bg: '#FDF6E3', text: '#B5860D' },
}
const DEFAULT_STAT_COLOR = { bg: '#F2E4D8', text: '#D4622A' }

// Single funnel for AI output, Schema.org output, and pasted JSON.
// Returns the app recipe shape (tags left as raw strings — resolve at
// confirm time via resolveTags). Throws user-readable Errors.
export function normalizeImportedRecipe(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error("That doesn't look like a recipe. Try again or use a different source.")
  }
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) throw new Error('The imported recipe is missing a title.')

  const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
    .map(entry => {
      if (typeof entry === 'string') return splitIngredientLine(entry)
      if (entry && typeof entry === 'object' && typeof entry.name === 'string' && entry.name.trim()) {
        return {
          name: entry.name.trim(),
          amount: entry.amount == null ? '' : String(entry.amount).trim(),
        }
      }
      return null
    })
    .filter(i => i && i.name)

  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map(s => (typeof s === 'string' ? s.replace(/^\s*\d+[.)]\s*/, '').trim() : ''))
    .filter(Boolean)

  const stats = (Array.isArray(raw.stats) ? raw.stats : [])
    .filter(s => s && typeof s === 'object' && (s.label || s.value))
    .map(s => {
      const label = String(s.label || '').trim()
      const stat = { label, value: s.value == null ? '' : String(s.value).trim() }
      if (s.color && s.color.bg) stat.color = s.color
      else if (s.colorClass !== undefined) stat.colorClass = s.colorClass
      else stat.color = STAT_COLORS[label.toLowerCase()] || DEFAULT_STAT_COLOR
      return stat
    })

  const rawCategory = typeof raw.category === 'string' ? raw.category.trim() : ''
  const category = rawCategory
    ? CATEGORY_MAP[rawCategory.toLowerCase()] ||
      rawCategory.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : ''

  return {
    title,
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    category,
    estimatedTime: typeof raw.estimatedTime === 'string' ? raw.estimatedTime.trim() : '',
    servingLabel:
      (typeof raw.servingLabel === 'string' && raw.servingLabel.trim()) || '1 serving',
    tags: (Array.isArray(raw.tags) ? raw.tags : [])
      .filter(t => typeof t === 'string' && t.trim())
      .map(t => t.trim()),
    ingredients,
    steps,
    notes: parseNotesToArray(raw.notes),
    stats,
    isUserAdded: true,
  }
}

// Match raw tag strings against existing tags by slug or label; create via
// addTag only when provided (pass null to match-only, e.g. scraped keywords).
export function resolveTags(rawTags, allTags, addTag) {
  const resolved = []
  for (const t of rawTags || []) {
    const existing = allTags.find(
      at => at.tag === t || at.label.toLowerCase() === t.toLowerCase()
    )
    const slug = existing ? existing.tag : addTag ? addTag(t) : null
    if (slug && !resolved.includes(slug)) resolved.push(slug)
  }
  return resolved
}

// Free public proxies go down / rate-limit — try each in order.
export const CORS_PROXIES = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

export async function fetchViaProxy(url, signal = null) {
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url), { signal })
      if (res.ok) return await res.text()
    } catch (e) {
      if (e.name === 'AbortError') throw e
    }
  }
  throw new Error("Couldn't reach that page. Check your connection and try again.")
}

export async function fetchWebsiteHtml(url, signal = null) {
  let target = String(url).trim()
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target
  return fetchViaProxy(target, signal)
}

// Hostname-suffix match (not includes) so "example.com/?q=instagram.com"
// doesn't count as a social URL.
const SOCIAL_HOSTS = ['instagram.com', 'instagr.am', 'tiktok.com']

export function isSocialUrl(url) {
  let target = String(url || '').trim()
  if (!target) return false
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target
  try {
    const host = new URL(target).hostname.toLowerCase()
    return SOCIAL_HOSTS.some(h => host === h || host.endsWith('.' + h))
  } catch {
    return false
  }
}

const SCHEMA_INSTRUCTIONS = `Return ONLY valid JSON matching this exact schema — no markdown, no code fences, no preamble, no explanation:
{
  "title": "string (required)",
  "description": "one or two sentence summary",
  "category": "one of: Breakfast, Lunch & Dinner, Sauces, Snacks, Desserts",
  "estimatedTime": "total time like \\"30 min\\" or \\"1 hr 15 min\\"",
  "servingLabel": "yield like \\"Makes 4 servings\\"",
  "tags": ["short lowercase slugs like \\"quick\\", \\"high-protein\\", \\"low-cal\\", \\"meal-prep\\""],
  "ingredients": [{ "name": "string", "amount": "string like \\"2 cups\\"" }],
  "steps": ["one string per step"],
  "notes": [{ "title": "string", "body": "string" }],
  "stats": [{ "label": "Cal", "value": "string" }]
}
All fields are optional except "title" and "ingredients". Omit fields you cannot determine — do not invent them.`

export function buildWebsitePrompt(pageText) {
  return `Extract the recipe from this web page text.\n\n${SCHEMA_INSTRUCTIONS}\n\nWeb page text:\n${pageText}`
}

export function buildTextPrompt(text) {
  return `Extract and structure the recipe from the following text.\n\n${SCHEMA_INSTRUCTIONS}\n\nText:\n${text}`
}

export function buildPhotoPrompt() {
  return `This is a photo of a recipe. Extract the complete recipe.

${SCHEMA_INSTRUCTIONS}

If you cannot read a complete recipe from this image, return {"error": true, "message": "Could not read recipe from image"} instead.`
}

export function buildYouTubePrompt(title, description, transcript) {
  const parts = [
    'Extract the recipe from this cooking video.',
    '',
    SCHEMA_INSTRUCTIONS,
    '',
    `Video title: ${title || '(unknown)'}`,
    `Video description:\n${description || '(none)'}`,
  ]
  if (transcript) {
    parts.push('', `Video transcript:\n${transcript}`)
  } else {
    parts.push('', 'No transcript is available — infer the recipe from the title and description if this is a well-known dish.')
  }
  return parts.join('\n')
}

export function buildSocialPrompt(url, content) {
  return `The user wants to import a recipe from this social media URL: ${url}
Here is whatever content was retrievable from the page (may be empty or incomplete due to platform restrictions):
${content || '(nothing retrievable)'}

If you can identify a recipe from the URL, the content, or your knowledge of this creator or video, extract it.

${SCHEMA_INSTRUCTIONS}

If you cannot identify a specific recipe, return {"error": true, "message": "Could not extract recipe. Try copying the caption and using Text import instead."} instead.`
}

export function buildGeneratePrompt(description) {
  return `Create a complete recipe for: ${description}
Use realistic ingredient amounts, practical step-by-step instructions, and include a calorie estimate in "stats" (label "Cal").

${SCHEMA_INSTRUCTIONS}`
}

export const JSON_TEMPLATE = JSON.stringify({
  title: "Recipe Name",
  description: "Brief description",
  category: "Lunch & Dinner",
  estimatedTime: "30 min",
  servingLabel: "4 portions",
  tags: ["quick", "high-protein"],
  ingredients: [
    { amount: "1 cup", name: "Ingredient name" },
    { amount: "½ tbsp", name: "Another ingredient" },
    { amount: "", name: "Ingredient with no amount" }
  ],
  steps: [
    "First step goes here.",
    "Second step goes here."
  ],
  notes: [
    { title: "Tip label", body: "Tip text" }
  ],
  stats: [
    { label: "Cal", value: "400" },
    { label: "Protein", value: "30g" }
  ]
}, null, 2)
