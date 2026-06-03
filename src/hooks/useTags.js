import { useState } from 'react'

const STORAGE_KEY = 'custom-tags'

export const BUILT_IN_TAGS = [
  { tag: 'breakfast',    label: 'Breakfast',    color: { bg: '#EDE6F7', text: '#7B5EA7' } },
  { tag: 'lunch',        label: 'Lunch',        color: { bg: '#E6F4EC', text: '#2E7D52' } },
  { tag: 'dinner',       label: 'Dinner',       color: { bg: '#E0EEF7', text: '#1A5F8A' } },
  { tag: 'meal-prep',    label: 'Meal prep',    color: { bg: '#F2E4D8', text: '#D4622A' } },
  { tag: 'quick',        label: 'Quick make',   color: { bg: '#FDF6E3', text: '#B5860D' } },
  { tag: 'high-protein', label: 'High protein', color: { bg: '#E6F4EC', text: '#2E7D52' } },
  { tag: 'low-cal',      label: 'Low calorie',  color: { bg: '#EAF0E8', text: '#4A6741' } },
  { tag: 'sauce',        label: 'Sauce',        color: { bg: '#F5E8E4', text: '#8A3A1A' } },
]

export const COLOR_PALETTE = [
  { bg: '#EDE6F7', text: '#7B5EA7' },  // purple
  { bg: '#E0EEF7', text: '#1A5F8A' },  // blue
  { bg: '#E8EAF4', text: '#3A4AAA' },  // indigo
  { bg: '#E8E8FA', text: '#4040A0' },  // periwinkle
  { bg: '#E6F4EC', text: '#2E7D52' },  // green
  { bg: '#EAF0E8', text: '#4A6741' },  // forest
  { bg: '#E8F4F0', text: '#1A7A60' },  // teal
  { bg: '#E4F6F4', text: '#147060' },  // seafoam
  { bg: '#EBF8E8', text: '#3A7020' },  // lime
  { bg: '#E4F4FA', text: '#1A6080' },  // cyan
  { bg: '#FDF6E3', text: '#B5860D' },  // amber
  { bg: '#FFF0DC', text: '#B06010' },  // peach
  { bg: '#F2E4D8', text: '#D4622A' },  // orange
  { bg: '#F5E8E4', text: '#8A3A1A' },  // terra cotta
  { bg: '#FAE8E8', text: '#B03030' },  // red
  { bg: '#FDE8F0', text: '#A01858' },  // pink
  { bg: '#F4E8EC', text: '#8A1A3A' },  // rose
  { bg: '#F4E8F4', text: '#8A3A8A' },  // magenta
  { bg: '#EEE8F0', text: '#604870' },  // plum
  { bg: '#EAE8E0', text: '#5A5030' },  // khaki
]

function loadCustomTags() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Migration: add any built-in tags not yet in storage
      const missing = BUILT_IN_TAGS.filter(bt => !parsed.some(t => t.tag === bt.tag))
      if (missing.length === 0) return parsed
      const merged = [...missing, ...parsed]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      return merged
    }
    // First load: seed with built-in tags
    const initial = [...BUILT_IN_TAGS]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  } catch {
    return [...BUILT_IN_TAGS]
  }
}

function saveCustomTags(tags) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tags))
}

export function useTags() {
  const [customTags, setCustomTags] = useState(loadCustomTags)

  // All tags now live in customTags (built-ins migrated in on first load)
  const allTags = customTags

  function addTag(label, color = null) {
    const trimmed = label.trim()
    if (!trimmed) return null
    const slug = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!slug) return null
    const existing = allTags.find(
      t => t.tag === slug || t.label.toLowerCase() === trimmed.toLowerCase()
    )
    if (existing) return existing.tag
    const assignedColor = color || COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
    const newTag = { tag: slug, label: trimmed, color: assignedColor, isCustom: true }
    setCustomTags(prev => {
      const next = [...prev, newTag]
      saveCustomTags(next)
      return next
    })
    return slug
  }

  function editTag(slug, { label, color }) {
    setCustomTags(prev => {
      const next = prev.map(t => t.tag === slug ? { ...t, label, color } : t)
      saveCustomTags(next)
      return next
    })
  }

  function deleteTag(tagSlug) {
    setCustomTags(prev => {
      const next = prev.filter(t => t.tag !== tagSlug)
      saveCustomTags(next)
      return next
    })
  }

  function replaceAll(cloudTags) {
    saveCustomTags(cloudTags)
    setCustomTags(cloudTags)
  }

  return { allTags, customTags, addTag, editTag, deleteTag, replaceAll }
}
