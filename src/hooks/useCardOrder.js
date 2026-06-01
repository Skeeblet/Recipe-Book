import { useState } from 'react'

const STORAGE_KEY = 'card-order'

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function persist(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
}

export function useCardOrder() {
  const [order, setOrder] = useState(load)

  function initOrderExact(ids) {
    persist(ids)
    setOrder(ids)
  }

  function reorder(fromId, toId) {
    if (fromId === toId) return
    setOrder(prev => {
      const arr = [...prev]
      const fromIdx = arr.indexOf(fromId)
      const toIdx = arr.indexOf(toId)
      if (fromIdx === -1 || toIdx === -1) return prev
      arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, fromId)
      persist(arr)
      return arr
    })
  }

  function appendNew(id) {
    setOrder(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      persist(next)
      return next
    })
  }

  function removeId(id) {
    setOrder(prev => {
      const next = prev.filter(x => x !== id)
      persist(next)
      return next
    })
  }

  function replaceAll(cloudOrder) {
    persist(cloudOrder)
    setOrder(cloudOrder)
  }

  return { order, reorder, appendNew, removeId, initOrderExact, replaceAll }
}
