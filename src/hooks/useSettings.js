import { useState } from 'react'

const STORAGE_KEY = 'app-settings'
const DEFAULTS = { smartUnits: true, cardMode: 'deck', aiModel: 'gemini-1.5-flash', fontSize: 'medium', theme: 'system' }

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(load)

  function set(key, value) {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function replaceAll(cloudSettings) {
    const merged = { ...DEFAULTS, ...cloudSettings }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    setSettings(merged)
  }

  return { settings, set, replaceAll }
}
