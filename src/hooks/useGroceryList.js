import { useState } from 'react'

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
    mutate(prev => {
      const existingNames = new Set(prev.map(i => i.name.toLowerCase()))
      const newItems = recipe.ingredients
        .filter(ing => ing.name.trim())
        .map(ing => ({
          id: Date.now() + Math.random(),
          amount: ing.amount || '',
          name: ing.name,
          checked: false,
          recipeTitle: recipe.title,
        }))
        .filter(item => !existingNames.has(item.name.toLowerCase()))
      return [...prev, ...newItems]
    })
  }

  function addItem(name, amount = '', recipeTitle = '') {
    const trimmedName = (name || '').trim()
    if (!trimmedName) return
    mutate(prev => {
      if (prev.some(i => i.name.toLowerCase() === trimmedName.toLowerCase())) return prev
      return [...prev, {
        id: Date.now() + Math.random(),
        amount: (amount || '').trim(),
        name: trimmedName,
        checked: false,
        recipeTitle,
      }]
    })
  }

  function updateItem(id, { amount, name }) {
    mutate(prev => prev.map(i => i.id === id ? { ...i, amount, name } : i))
  }

  function toggleItem(id) {
    mutate(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  function removeItem(id) {
    mutate(prev => prev.filter(i => i.id !== id))
  }

  function clearChecked() {
    mutate(prev => prev.filter(i => !i.checked))
  }

  function replaceAll(cloudItems) {
    save(cloudItems)
    setItems(cloudItems)
  }

  return { items, addIngredients, addItem, updateItem, toggleItem, removeItem, clearChecked, replaceAll }
}
