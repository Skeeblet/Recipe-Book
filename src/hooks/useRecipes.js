import { useState } from 'react'

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

  const recipes = userRecipes

  function addRecipe(data) {
    setUserRecipes(prev => {
      const num = String(prev.length + 1).padStart(2, '0')
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
      const next = prev.map(r => (r.id === id ? { ...r, ...data } : r))
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

  function replaceAll(cloudRecipes) {
    const userOnly = cloudRecipes.filter(r => r.isUserAdded)
    saveUserRecipes(userOnly)
    setUserRecipes(userOnly)
  }

  return { recipes, addRecipe, updateRecipe, deleteRecipe, replaceAll }
}
