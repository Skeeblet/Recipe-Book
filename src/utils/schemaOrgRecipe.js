// Schema.org Recipe JSON-LD extraction for website import.

const UNIT_WORDS = new Set([
  'cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'teaspoon', 'teaspoons', 'tsp',
  'gram', 'grams', 'g', 'kilogram', 'kilograms', 'kg', 'ounce', 'ounces', 'oz',
  'pound', 'pounds', 'lb', 'lbs', 'milliliter', 'milliliters', 'ml', 'liter', 'liters', 'l',
  'quart', 'quarts', 'qt', 'pint', 'pints', 'clove', 'cloves', 'can', 'cans',
  'slice', 'slices', 'pinch', 'dash', 'stick', 'sticks', 'bunch', 'bunches',
  'package', 'packages', 'head', 'heads', 'piece', 'pieces', 'sprig', 'sprigs',
  'large', 'medium', 'small',
])

const FRACTIONS = '¼½¾⅓⅔⅕⅖⅗⅘⅛⅜⅝⅞⅙⅚'
const QTY_RE = new RegExp(
  `^(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?\\s*[${FRACTIONS}]?|[${FRACTIONS}])` +
  `(?:\\s*[-–]\\s*(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[${FRACTIONS}]))?`
)

// "2 cups flour" -> { amount: "2 cups", name: "flour" }
export function splitIngredientLine(line) {
  if (typeof line !== 'string') return null
  const str = stripHtml(line)
  if (!str) return null

  const m = str.match(QTY_RE)
  if (!m) return { amount: '', name: str.replace(/^of\s+/i, '') }

  let amount = m[0].trim()
  let rest = str.slice(m[0].length).trim()
  const unitMatch = rest.match(/^([A-Za-z.]+)(?:\s+|$)/)
  if (unitMatch && UNIT_WORDS.has(unitMatch[1].replace(/\.$/, '').toLowerCase())) {
    amount += ' ' + unitMatch[1].replace(/\.$/, '')
    rest = rest.slice(unitMatch[0].length).trim()
  }
  rest = rest.replace(/^of\s+/i, '')
  return rest ? { amount, name: rest } : { amount: '', name: str }
}

// "PT1H30M" / "PT90M" -> "1 hr 30 min"; unparsable -> ''
export function parseIsoDuration(iso) {
  if (typeof iso !== 'string') return ''
  const m = iso.trim().match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+(?:\.\d+)?S)?)?$/i)
  if (!m) return ''
  const total = (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0)
  if (!total) return ''
  const hrs = Math.floor(total / 60)
  const mins = total % 60
  if (hrs && mins) return `${hrs} hr ${mins} min`
  if (hrs) return `${hrs} hr`
  return `${mins} min`
}

function stripHtml(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function first(v) {
  return Array.isArray(v) ? v[0] : v
}

function isRecipeNode(node) {
  const type = node['@type']
  return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
}

function flattenInstructions(instructions, out = []) {
  if (!instructions) return out
  if (typeof instructions === 'string') {
    instructions.split(/\r?\n+/).forEach(s => {
      const clean = stripHtml(s)
      if (clean) out.push(clean)
    })
    return out
  }
  if (Array.isArray(instructions)) {
    instructions.forEach(item => flattenInstructions(item, out))
    return out
  }
  if (typeof instructions === 'object') {
    if (Array.isArray(instructions.itemListElement)) {
      return flattenInstructions(instructions.itemListElement, out)
    }
    const text = stripHtml(String(instructions.text || instructions.name || ''))
    if (text) out.push(text)
  }
  return out
}

function mapNutrition(nutrition) {
  if (!nutrition || typeof nutrition !== 'object') return []
  const stats = []
  if (nutrition.calories) {
    const value = String(nutrition.calories).replace(/\s*k?cal(?:ories)?\s*$/i, '').trim()
    if (value) stats.push({ label: 'Cal', value })
  }
  for (const [key, label] of [['proteinContent', 'Protein'], ['fiberContent', 'Fiber'], ['fatContent', 'Fat']]) {
    if (nutrition[key]) {
      const value = String(nutrition[key]).replace(/\s*grams?\s*$/i, 'g').trim()
      if (value) stats.push({ label, value })
    }
  }
  return stats
}

function mapServingLabel(recipeYield) {
  const y = first(recipeYield)
  if (y == null) return ''
  if (typeof y === 'number' || /^\d+$/.test(String(y).trim())) {
    const n = parseInt(y, 10)
    return `${n} serving${n === 1 ? '' : 's'}`
  }
  return stripHtml(String(y))
}

function mapKeywords(recipe) {
  const raw = []
  const keywords = recipe.keywords
  if (typeof keywords === 'string') raw.push(...keywords.split(','))
  else if (Array.isArray(keywords)) raw.push(...keywords)
  const category = recipe.recipeCategory
  if (typeof category === 'string') raw.push(...category.split(','))
  else if (Array.isArray(category)) raw.push(...category)
  return raw.map(k => String(k).trim()).filter(Boolean)
}

function mapSchemaRecipe(recipe) {
  const rawIngredients = recipe.recipeIngredient || recipe.ingredients
  return {
    title: stripHtml(String(first(recipe.name) || '')),
    description: stripHtml(String(first(recipe.description) || '')),
    estimatedTime: parseIsoDuration(recipe.totalTime || recipe.cookTime || recipe.prepTime || ''),
    servingLabel: mapServingLabel(recipe.recipeYield),
    tags: mapKeywords(recipe),
    ingredients: (Array.isArray(rawIngredients) ? rawIngredients : [])
      .map(splitIngredientLine)
      .filter(Boolean),
    steps: flattenInstructions(recipe.recipeInstructions),
    stats: mapNutrition(recipe.nutrition),
  }
}

// Returns a raw recipe-shaped object (for normalizeImportedRecipe) or null.
export function extractRecipeFromHtml(html) {
  let doc
  try {
    doc = new DOMParser().parseFromString(html, 'text/html')
  } catch {
    return null
  }
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let parsed
    try {
      parsed = JSON.parse(script.textContent)
    } catch {
      continue
    }
    const nodes = []
    const collect = node => {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) {
        node.forEach(collect)
        return
      }
      nodes.push(node)
      if (Array.isArray(node['@graph'])) node['@graph'].forEach(collect)
    }
    collect(parsed)
    const recipeNode = nodes.find(isRecipeNode)
    if (recipeNode) return mapSchemaRecipe(recipeNode)
  }
  return null
}

// Plain text of a page for the AI fallback: strip scripts/styles/tags,
// collapse whitespace, then truncate.
export function htmlToText(html, maxLen = 12000) {
  let text = ''
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('script, style, noscript, svg').forEach(el => el.remove())
    text = doc.body ? doc.body.textContent : ''
  } catch {
    text = String(html).replace(/<[^>]*>/g, ' ')
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLen)
}
