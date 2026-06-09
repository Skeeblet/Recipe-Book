import { useState } from 'react'
import { lookupCategory } from '../utils/ingredientCategories.js'

const STORAGE_KEY = 'grocery-list'

function migrateItem(item) {
  if ('name' in item) return item
  // Old format: { id, text, checked, recipeTitle }
  return { id: item.id, amount: '', name: item.text || '', checked: item.checked, recipeTitle: item.recipeTitle }
}

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored).map(migrateItem) : []
  } catch {
    return []
  }
}

function save(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useGroceryList() {
  const [items, setItems] = useState(load)

  function mutate(fn) {
    setItems(prev => {
      const next = fn(prev)
      save(next)
      return next
    })
  }

  function addIngredients(recipe) {
    const existingNames = new Set(items.map(i => i.name.toLowerCase()))
    const newItems = recipe.ingredients
      .filter(ing => ing.name.trim())
      .map(ing => ({
        id: Date.now() + Math.random(),
        amount: ing.amount || '',
        name: ing.name,
        checked: false,
        recipeTitle: recipe.title,
        category: lookupCategory(ing.name),
      }))
      .filter(item => !existingNames.has(item.name.toLowerCase()))

    if (newItems.length) {
      mutate(prev => {
        const existingNamesNow = new Set(prev.map(i => i.name.toLowerCase()))
        const filtered = newItems.filter(i => !existingNamesNow.has(i.name.toLowerCase()))
        return [...prev, ...filtered]
      })
    }

    return newItems
  }

  function addItem(name, amount = '', recipeTitle = '') {
    const trimmedName = (name || '').trim()
    if (!trimmedName) return null
    const duplicate = items.some(i => i.name.toLowerCase() === trimmedName.toLowerCase())
    if (duplicate) return null
    const item = {
      id: Date.now() + Math.random(),
      amount: (amount || '').trim(),
      name: trimmedName,
      checked: false,
      recipeTitle,
      category: lookupCategory(trimmedName),
    }
    mutate(prev => {
      if (prev.some(i => i.name.toLowerCase() === trimmedName.toLowerCase())) return prev
      return [...prev, item]
    })
    return item
  }

  function updateItem(id, { amount, name }) {
    mutate(prev => prev.map(i => i.id === id ? { ...i, amount, name } : i))
  }

  function updateItemCategory(id, category) {
    mutate(prev => prev.map(i => i.id === id ? { ...i, category } : i))
  }

  function toggleItem(id) {
    mutate(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  function removeItem(id) {
    mutate(prev => prev.filter(i => i.id !== id))
  }

  function removeItems(ids) {
    mutate(prev => prev.filter(i => !ids.includes(i.id)))
  }

  function clearChecked() {
    mutate(prev => prev.filter(i => !i.checked))
  }

  function clearAll() {
    mutate(() => [])
  }

  function replaceAll(cloudItems) {
    save(cloudItems)
    setItems(cloudItems)
  }

  return { items, addIngredients, addItem, updateItem, updateItemCategory, toggleItem, removeItem, removeItems, clearChecked, clearAll, replaceAll }
}
