import { useEffect, useRef } from 'react'
import { db } from '../firebase/config.js'
import {
  writeRecipe,
  writeGroceryItem,
  writeTag,
  writeSettings,
  writeCardOrder,
} from '../firebase/firestoreAdapter.js'

// `ready` must stay false until the initial cloud pull/merge has completed —
// otherwise the boot-time state (stale localStorage) gets bulk-written to the
// cloud and resurrects recipes deleted on other devices.
export function useFirestoreSync(uid, ready, { recipes, groceryItems, customTags, settings, cardOrder }) {
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

  // Cancel a pending write when the uid changes (sign-out/switch) or on
  // unmount — a stale closure must not write to the cloud after the fact.
  function cancelOnCleanup(key) {
    return () => clearTimeout(timers.current[key])
  }

  useEffect(() => {
    if (!uid || !ready) return
    debounce('recipes', () => {
      if (!navigator.onLine) {
        recipes.filter(r => r.isUserAdded).forEach(r => dirtyRecipes.current.add(r.id))
        return
      }
      recipes.filter(r => r.isUserAdded).forEach(r =>
        writeRecipe(db, uid, r)
          .then(() => dirtyRecipes.current.delete(r.id))
          .catch(err => { console.error(err); dirtyRecipes.current.add(r.id) })
      )
    }, 1500)
    return cancelOnCleanup('recipes')
  }, [uid, ready, recipes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!uid || !ready) return
    debounce('grocery', () => {
      if (!navigator.onLine) {
        groceryItems.forEach(i => dirtyGrocery.current.add(i.id))
        return
      }
      groceryItems.forEach(i =>
        writeGroceryItem(db, uid, i)
          .then(() => dirtyGrocery.current.delete(i.id))
          .catch(err => { console.error(err); dirtyGrocery.current.add(i.id) })
      )
    }, 1500)
    return cancelOnCleanup('grocery')
  }, [uid, ready, groceryItems]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!uid || !ready) return
    debounce('tags', () => {
      if (!navigator.onLine) {
        customTags.forEach(t => dirtyTags.current.add(t.tag))
        return
      }
      customTags.forEach(t =>
        writeTag(db, uid, t)
          .then(() => dirtyTags.current.delete(t.tag))
          .catch(err => { console.error(err); dirtyTags.current.add(t.tag) })
      )
    }, 1500)
    return cancelOnCleanup('tags')
  }, [uid, ready, customTags]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!uid || !ready) return
    debounce('settings', () => {
      if (!navigator.onLine) { dirtySettings.current = true; return }
      writeSettings(db, uid, settings)
        .then(() => { dirtySettings.current = false })
        .catch(err => { console.error(err); dirtySettings.current = true })
    }, 800)
    return cancelOnCleanup('settings')
  }, [uid, ready, settings]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!uid || !ready) return
    debounce('cardOrder', () => {
      if (!navigator.onLine) { dirtyCardOrder.current = true; return }
      writeCardOrder(db, uid, cardOrder)
        .then(() => { dirtyCardOrder.current = false })
        .catch(err => { console.error(err); dirtyCardOrder.current = true })
    }, 800)
    return cancelOnCleanup('cardOrder')
  }, [uid, ready, cardOrder]) // eslint-disable-line react-hooks/exhaustive-deps

  // Online recovery — registered once per uid, reads current data via dataRef
  useEffect(() => {
    if (!uid || !ready) return
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
  }, [uid, ready]) // data read via dataRef, no re-registration on state changes
}
