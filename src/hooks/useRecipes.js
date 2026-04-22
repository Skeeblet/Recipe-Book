import { useState } from 'react'
import { SEED_RECIPES } from '../data/recipes.js'

const STORAGE_KEY = 'user-recipes'

function loadUserRecipes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveUserRecipes(recipes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
}

export function useRecipes() {
  const [userRecipes, setUserRecipes] = useState(loadUserRecipes)

  const overriddenIds = new Set(userRecipes.map(r => r.id))
  const recipes = [
    ...SEED_RECIPES.filter(r => !overriddenIds.has(r.id)),
    ...userRecipes,
  ]

  function addRecipe(data) {
    setUserRecipes(prev => {
      const num = String(SEED_RECIPES.length + prev.length + 1).padStart(2, '0')
      const newRecipe = {
        ...data,
        id: data.id || ('user-' + Date.now()),
        num,
        isUserAdded: true,
      }
      const next = [...prev, newRecipe]
      saveUserRecipes(next)
      return next
    })
  }

  function updateRecipe(id, data) {
    setUserRecipes(prev => {
      const exists = prev.find(r => r.id === id)
      const next = exists
        ? prev.map(r => (r.id === id ? { ...r, ...data } : r))
        : [...prev, { ...SEED_RECIPES.find(r => r.id === id), ...data }]
      saveUserRecipes(next)
      return next
    })
  }

  function deleteRecipe(id) {
    setUserRecipes(prev => {
      const next = prev.filter(r => r.id !== id)
      saveUserRecipes(next)
      return next
    })
  }

  return { recipes, addRecipe, updateRecipe, deleteRecipe }
}
