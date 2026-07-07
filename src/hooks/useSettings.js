import { useState } from 'react'

const STORAGE_KEY = 'app-settings'
const DEFAULTS = { smartUnits: true, cardMode: 'deck', aiModel: 'gemini-2.5-flash', aiApiKey: '', fontSize: 'medium', theme: 'system' }

// Settings saved (locally or in the cloud) before a model retirement may
// reference dead model ids — map them forward.
function migrate(settings) {
  if (settings.aiModel === 'gemini-1.5-flash') settings.aiModel = 'gemini-2.5-flash'
  return settings
}

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? migrate({ ...DEFAULTS, ...JSON.parse(stored) }) : DEFAULTS
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
    setSettings(prev => {
      // The AI API key is device-local (stripped before cloud writes) — a cloud
      // pull must never blank it out.
      const merged = migrate({ ...DEFAULTS, ...cloudSettings, aiApiKey: prev.aiApiKey || '' })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      return merged
    })
  }

  return { settings, set, replaceAll }
}
