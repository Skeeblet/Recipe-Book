import { useState } from 'react'
import { SEED_RECIPES } from '../data/recipes.js'

const STORAGE_KEY = 'user-recipes'
const DELETED_SEEDS_KEY = 'deleted-seeds'

const SEED_IDS = new Set(SEED_RECIPES.map(r => r.id))

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

function loadDeletedSeeds() {
  try {
    const stored = localStorage.getItem(DELETED_SEEDS_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function saveDeletedSeeds(set) {
  localStorage.setItem(DELETED_SEEDS_KEY, JSON.stringify([...set]))
}

export function useRecipes() {
  const [userRecipes, setUserRecipes] = useState(loadUserRecipes)
  const [deletedSeedIds, setDeletedSeedIds] = useState(loadDeletedSeeds)

  const overriddenIds = new Set(userRecipes.map(r => r.id))
  const recipes = [
    ...SEED_RECIPES.filter(r => !overriddenIds.has(r.id) && !deletedSeedIds.has(r.id)),
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
    // Remove from user recipes (covers edited seeds too)
    setUserRecipes(prev => {
      const next = prev.filter(r => r.id !== id)
      saveUserRecipes(next)
      return next
    })
    // If it's a seed recipe, track the deletion so it doesn't reappear
    if (SEED_IDS.has(id)) {
      setDeletedSeedIds(prev => {
        const next = new Set([...prev, id])
        saveDeletedSeeds(next)
        return next
      })
    }
  }

  function replaceAll(cloudRecipes) {
    const userOnly = cloudRecipes.filter(r => r.isUserAdded)
    saveUserRecipes(userOnly)
    setUserRecipes(userOnly)
  }

  return { recipes, addRecipe, updateRecipe, deleteRecipe, replaceAll }
}
