const UNICODE_FRACS = {
  '¼': 1/4, '½': 1/2, '¾': 3/4,
  '⅓': 1/3, '⅔': 2/3,
  '⅛': 1/8, '⅜': 3/8, '⅝': 5/8, '⅞': 7/8,
}

const NICE_FRACS = [
  [1/8, '⅛'], [1/4, '¼'], [1/3, '⅓'], [3/8, '⅜'],
  [1/2, '½'], [5/8, '⅝'], [2/3, '⅔'], [3/4, '¾'],
  [7/8, '⅞'],
]

// Unit conversion chains: units[] ordered smallest→largest, ratios[] between adjacent units
const UNIT_CHAINS = [
  { units: ['tsp', 'tbsp', 'cup'],  ratios: [3, 16] },
  { units: ['fl oz', 'cup', 'qt'], ratios: [8, 4] },
  { units: ['oz', 'lb'],           ratios: [16] },
  { units: ['g', 'kg'],            ratios: [1000] },
  { units: ['ml', 'l'],            ratios: [1000] },
]

// Aliases map: canonical lowercase unit → chain unit key
const UNIT_ALIASES = {
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp',
  cup: 'cup', cups: 'cup',
  'fl oz': 'fl oz', 'fluid oz': 'fl oz', 'fl. oz': 'fl oz',
  qt: 'qt', quart: 'qt', quarts: 'qt',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
}

function parseLeadingNumber(str) {
  const s = str.trim()

  // whole + unicode fraction: "1½"
  let m = s.match(/^(\d+)([¼-¾⅐-⅞])(.*)/)
  if (m && UNICODE_FRACS[m[2]] !== undefined)
    return { num: parseInt(m[1]) + UNICODE_FRACS[m[2]], rest: m[3] }

  // just unicode fraction: "½"
  m = s.match(/^([¼-¾⅐-⅞])(.*)/)
  if (m && UNICODE_FRACS[m[1]] !== undefined)
    return { num: UNICODE_FRACS[m[1]], rest: m[2] }

  // mixed number with text fraction: "1 1/2"
  m = s.match(/^(\d+)\s+(\d+)\/(\d+)(.*)/)
  if (m) return { num: parseInt(m[1]) + parseInt(m[2]) / parseInt(m[3]), rest: m[4] }

  // text fraction: "1/2"
  m = s.match(/^(\d+)\/(\d+)(.*)/)
  if (m) return { num: parseInt(m[1]) / parseInt(m[2]), rest: m[3] }

  // decimal or integer
  m = s.match(/^(\d+(?:\.\d+)?)(.*)/)
  if (m) return { num: parseFloat(m[1]), rest: m[2] }

  return null
}

function formatNumber(n) {
  if (n <= 0) return '0'
  const whole = Math.floor(n)
  const frac = n - whole
  if (frac < 0.01) return `${whole}`
  let bestSym = null, bestDiff = Infinity
  for (const [val, sym] of NICE_FRACS) {
    const diff = Math.abs(frac - val)
    if (diff < bestDiff) { bestDiff = diff; bestSym = sym }
  }
  if (bestDiff < 0.07) return whole === 0 ? bestSym : `${whole}${bestSym}`
  const rounded = Math.round(n * 10) / 10
  return rounded % 1 === 0 ? `${rounded}` : rounded.toFixed(1)
}

// Returns { unit: canonicalKey, remaining: string } or null
function detectUnit(rest) {
  const s = rest.trimStart()
  if (!s) return null

  // Two-word: "fl oz"
  const flMatch = s.match(/^(fl\.?\s*oz)\b(.*)/i)
  if (flMatch) return { unit: 'fl oz', remaining: flMatch[2] }

  // Single word
  const m = s.match(/^([a-zA-Z]+)([\s,.].*|$)/)
  if (!m) return null
  const word = m[1].toLowerCase()
  const canonical = UNIT_ALIASES[word]
  if (!canonical) return null
  return { unit: canonical, remaining: m[2] }
}

function applyChainConversion(num, unit) {
  for (const chain of UNIT_CHAINS) {
    let idx = chain.units.indexOf(unit)
    if (idx === -1) continue
    let cur = num
    while (idx < chain.units.length - 1 && cur >= chain.ratios[idx]) {
      cur /= chain.ratios[idx]
      idx++
    }
    return { num: cur, unit: chain.units[idx] }
  }
  return { num, unit }
}

export function scaleAmount(amountStr, factor, smartUnits = true) {
  if (factor === 1 || !amountStr) return amountStr
  const parsed = parseLeadingNumber(amountStr)
  if (!parsed) return amountStr
  const scaled = parsed.num * factor

  if (smartUnits) {
    const unitInfo = detectUnit(parsed.rest)
    if (unitInfo) {
      const converted = applyChainConversion(scaled, unitInfo.unit)
      return formatNumber(converted.num) + ' ' + converted.unit + unitInfo.remaining
    }
  }

  return formatNumber(scaled) + parsed.rest
}

export function parseServingBase(label) {
  const m = (label || '').match(/(\d+)/)
  return m ? parseInt(m[1]) : 1
}

export function parseServingUnit(label) {
  return (label || '').replace(/^\d+\s*/, '').trim() || 'serving'
}
