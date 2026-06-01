import { useEffect, useRef } from 'react'
import { db } from '../firebase/config.js'
import {
  writeRecipe,
  writeGroceryItem,
  writeTag,
  writeSettings,
  writeCardOrder,
} from '../firebase/firestoreAdapter.js'

export function useFirestoreSync(uid, { recipes, groceryItems, customTags, settings, cardOrder }) {
  const timers = useRef({})
  const dataRef = useRef({})
  const dirtyRecipes = useRef(new Set())
  const dirtyGrocery = useRef(new Set())
  const dirtyTags = useRef(new Set())
  const dirtySettings = useRef(false)
  const dirtyCardOrder = useRef(false)

  // Keep ref current so the online handler always sees fresh state without re-registering
  dataRef.current = { recipes, groceryItems, customTags, settings, cardOrder }

  function debounce(key, fn, delay) {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(fn, delay)
  }

  useEffect(() => {
    if (!uid) return
    debounce('recipes', () => {
      if (!navigator.onLine) {
        recipes.filter(r => r.isUserAdded).forEach(r => dirtyRecipes.current.add(r.id))
        return
      }
      recipes.filter(r => r.isUserAdded).forEach(r =>
        writeRecipe(db, uid, r)
          .then(() => dirtyRecipes.current.delete(r.id))
          .catch(console.error)
      )
    }, 1500)
  }, [uid, recipes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!uid) return
    debounce('grocery', () => {
      if (!navigator.onLine) {
        groceryItems.forEach(i => dirtyGrocery.current.add(i.id))
        return
      }
      groceryItems.forEach(i =>
        writeGroceryItem(db, uid, i)
          .then(() => dirtyGrocery.current.delete(i.id))
          .catch(console.error)
      )
    }, 1500)
  }, [uid, groceryItems]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!uid) return
    debounce('tags', () => {
      if (!navigator.onLine) {
        customTags.forEach(t => dirtyTags.current.add(t.tag))
        return
      }
      customTags.forEach(t =>
        writeTag(db, uid, t)
          .then(() => dirtyTags.current.delete(t.tag))
          .catch(console.error)
      )
    }, 1500)
  }, [uid, customTags]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!uid) return
    debounce('settings', () => {
      if (!navigator.onLine) { dirtySettings.current = true; return }
      writeSettings(db, uid, settings)
        .then(() => { dirtySettings.current = false })
        .catch(console.error)
    }, 800)
  }, [uid, settings]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!uid) return
    debounce('cardOrder', () => {
      if (!navigator.onLine) { dirtyCardOrder.current = true; return }
      writeCardOrder(db, uid, cardOrder)
        .then(() => { dirtyCardOrder.current = false })
        .catch(console.error)
    }, 800)
  }, [uid, cardOrder]) // eslint-disable-line react-hooks/exhaustive-deps

  // Online recovery — registered once per uid, reads current data via dataRef
  useEffect(() => {
    if (!uid) return
    function handleOnline() {
      const { recipes, groceryItems, customTags, settings, cardOrder } = dataRef.current
      const dirtyR = recipes.filter(r => r.isUserAdded && dirtyRecipes.current.has(r.id))
      const dirtyG = groceryItems.filter(i => dirtyGrocery.current.has(i.id))
      const dirtyT = customTags.filter(t => dirtyTags.current.has(t.tag))
      dirtyR.forEach(r =>
        writeRecipe(db, uid, r).then(() => dirtyRecipes.current.delete(r.id)).catch(console.error)
      )
      dirtyG.forEach(i =>
        writeGroceryItem(db, uid, i).then(() => dirtyGrocery.current.delete(i.id)).catch(console.error)
      )
      dirtyT.forEach(t =>
        writeTag(db, uid, t).then(() => dirtyTags.current.delete(t.tag)).catch(console.error)
      )
      if (dirtySettings.current) {
        writeSettings(db, uid, dataRef.current.settings)
          .then(() => { dirtySettings.current = false })
          .catch(console.error)
      }
      if (dirtyCardOrder.current) {
        writeCardOrder(db, uid, dataRef.current.cardOrder)
          .then(() => { dirtyCardOrder.current = false })
          .catch(console.error)
      }
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [uid]) // uid only — data read via dataRef, no re-registration on state changes
}
