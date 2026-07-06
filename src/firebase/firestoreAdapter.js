import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  getDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'

// ─── Amount parsing (duplicated from scaleAmount.js — those helpers are module-private) ───

const UNICODE_FRACS = {
  '¼': 1/4, '½': 1/2, '¾': 3/4,
  '⅓': 1/3, '⅔': 2/3,
  '⅛': 1/8, '⅜': 3/8, '⅝': 5/8, '⅞': 7/8,
}

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
  let m = s.match(/^(\d+)([¼-¾⅐-⅞])(.*)/)
  if (m && UNICODE_FRACS[m[2]] !== undefined)
    return { num: parseInt(m[1]) + UNICODE_FRACS[m[2]], rest: m[3] }
  m = s.match(/^([¼-¾⅐-⅞])(.*)/)
  if (m && UNICODE_FRACS[m[1]] !== undefined)
    return { num: UNICODE_FRACS[m[1]], rest: m[2] }
  m = s.match(/^(\d+)\s+(\d+)\/(\d+)(.*)/)
  if (m) return { num: parseInt(m[1]) + parseInt(m[2]) / parseInt(m[3]), rest: m[4] }
  m = s.match(/^(\d+)\/(\d+)(.*)/)
  if (m) return { num: parseInt(m[1]) / parseInt(m[2]), rest: m[3] }
  m = s.match(/^(\d+(?:\.\d+)?)(.*)/)
  if (m) return { num: parseFloat(m[1]), rest: m[2] }
  return null
}

function detectUnit(rest) {
  const s = rest.trimStart()
  if (!s) return null
  const flMatch = s.match(/^(fl\.?\s*oz)\b(.*)/i)
  if (flMatch) return { unit: 'fl oz' }
  const m = s.match(/^([a-zA-Z]+)([\s,.].*|$)/)
  if (!m) return null
  const canonical = UNIT_ALIASES[m[1].toLowerCase()]
  if (!canonical) return null
  return { unit: canonical }
}

export function parseAmount(amountStr) {
  if (!amountStr) return { quantity: null, unit: null }
  const parsed = parseLeadingNumber(amountStr)
  if (!parsed) return { quantity: null, unit: null }
  const unitInfo = detectUnit(parsed.rest)
  return {
    quantity: parsed.num,
    unit: unitInfo ? unitInfo.unit : null,
  }
}

// ─── Recipe ───────────────────────────────────────────────────────────────────

export function writeRecipe(db, uid, recipe) {
  const ref = doc(db, 'users', uid, 'recipes', String(recipe.id))
  return setDoc(ref, recipe)
}

export function deleteRecipeDoc(db, uid, recipeId) {
  return deleteDoc(doc(db, 'users', uid, 'recipes', String(recipeId)))
}

// ─── Grocery list ─────────────────────────────────────────────────────────────

export function writeGroceryItem(db, uid, item) {
  const ref = doc(db, 'users', uid, 'groceryList', String(item.id))
  const { quantity, unit } = parseAmount(item.amount)
  const { recipeTitle, ...rest } = item
  return setDoc(ref, {
    ...rest,
    quantity,
    unit,
    recipeSource: recipeTitle ?? null,
  })
}

export function deleteGroceryItemDoc(db, uid, itemId) {
  return deleteDoc(doc(db, 'users', uid, 'groceryList', String(itemId)))
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export function writeTag(db, uid, tag) {
  return setDoc(doc(db, 'users', uid, 'customTags', tag.tag), tag)
}

export function deleteTagDoc(db, uid, tagSlug) {
  return deleteDoc(doc(db, 'users', uid, 'customTags', tagSlug))
}

// ─── Deletion tombstones ──────────────────────────────────────────────────────
// users/{uid}/meta/deletions holds { recipes: {id: ts}, grocery: {id: ts} } so
// other devices can tell "deleted elsewhere" apart from "created here offline".
// Ids are Date.now()-based and never reused, so tombstones are permanent.

export function writeDeletions(db, uid, kind, ids) {
  const now = Date.now()
  const stamped = {}
  for (const id of ids) stamped[String(id)] = now
  return setDoc(doc(db, 'users', uid, 'meta', 'deletions'), { [kind]: stamped }, { merge: true })
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function writeSettings(db, uid, settings) {
  const { aiApiKey, ...safeSettings } = settings
  return setDoc(doc(db, 'users', uid, 'settings', 'prefs'), safeSettings)
}

// ─── Card order ───────────────────────────────────────────────────────────────

export function writeCardOrder(db, uid, orderArray) {
  return setDoc(doc(db, 'users', uid, 'cardOrder', 'order'), { ids: orderArray })
}

// ─── Delete all user data ─────────────────────────────────────────────────────

export async function deleteAllUserData(db, uid) {
  const colPaths = ['recipes', 'groceryList', 'customTags']
  const deletions = []

  for (const col of colPaths) {
    const snap = await getDocs(collection(db, 'users', uid, col))
    snap.docs.forEach(d => deletions.push(deleteDoc(d.ref)))
  }

  deletions.push(deleteDoc(doc(db, 'users', uid, 'settings', 'prefs')))
  deletions.push(deleteDoc(doc(db, 'users', uid, 'cardOrder', 'order')))
  deletions.push(deleteDoc(doc(db, 'users', uid, 'meta', 'deletions')))

  await Promise.all(deletions)
}

// ─── Pull all user data ───────────────────────────────────────────────────────

export async function pullAllUserData(db, uid) {
  const [recipesSnap, grocerySnap, tagsSnap, settingsSnap, cardOrderSnap, deletionsSnap] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'recipes')),
    getDocs(collection(db, 'users', uid, 'groceryList')),
    getDocs(collection(db, 'users', uid, 'customTags')),
    getDoc(doc(db, 'users', uid, 'settings', 'prefs')),
    getDoc(doc(db, 'users', uid, 'cardOrder', 'order')),
    getDoc(doc(db, 'users', uid, 'meta', 'deletions')),
  ])

  const recipes = recipesSnap.docs.map(d => d.data())

  const groceryList = grocerySnap.docs.map(d => {
    const { recipeSource, quantity, unit, ...rest } = d.data()
    return { ...rest, recipeTitle: recipeSource ?? null }
  })

  const tags = tagsSnap.docs.map(d => d.data())
  const settings = settingsSnap.exists() ? settingsSnap.data() : null
  const cardOrderDoc = cardOrderSnap.exists() ? cardOrderSnap.data() : null
  const cardOrder = cardOrderDoc?.ids ?? null

  const deletionsDoc = deletionsSnap.exists() ? deletionsSnap.data() : null
  const deletions = {
    recipes: deletionsDoc?.recipes || {},
    grocery: deletionsDoc?.grocery || {},
  }

  return { recipes, groceryList, tags, settings, cardOrder, deletions }
}

// ─── Seed (first-ever sign-in) ────────────────────────────────────────────────

export async function seedFirestore(db, uid, { recipes, groceryList, tags, settings, cardOrder }) {
  const items = []

  for (const recipe of recipes) {
    items.push({ ref: doc(db, 'users', uid, 'recipes', String(recipe.id)), data: recipe })
  }
  for (const item of groceryList) {
    const { quantity, unit } = parseAmount(item.amount)
    const { recipeTitle, ...rest } = item
    items.push({
      ref: doc(db, 'users', uid, 'groceryList', String(item.id)),
      data: { ...rest, quantity, unit, recipeSource: recipeTitle ?? null },
    })
  }
  for (const tag of tags) {
    items.push({ ref: doc(db, 'users', uid, 'customTags', tag.tag), data: tag })
  }
  if (settings) {
    // The AI API key is device-local — never write it to the cloud
    const { aiApiKey, ...safeSettings } = settings
    items.push({ ref: doc(db, 'users', uid, 'settings', 'prefs'), data: safeSettings })
  }
  if (cardOrder) {
    items.push({ ref: doc(db, 'users', uid, 'cardOrder', 'order'), data: { ids: cardOrder } })
  }

  // Firestore batches are limited to 500 operations
  for (let i = 0; i < items.length; i += 500) {
    const batch = writeBatch(db)
    items.slice(i, i + 500).forEach(({ ref, data }) => batch.set(ref, data))
    await batch.commit()
  }
}

// ─── Public recipe sharing ─────────────────────────────────────────────────

export async function fetchPublicRecipe(db, recipeId) {
  const snap = await getDoc(doc(db, 'publicRecipes', String(recipeId)))
  return snap.exists() ? snap.data() : null
}

export function writePublicRecipe(db, recipe) {
  return setDoc(doc(db, 'publicRecipes', String(recipe.id)), { ...recipe, sharedAt: serverTimestamp() })
}
