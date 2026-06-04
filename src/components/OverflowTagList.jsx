import { useLayoutEffect, useRef, useState } from 'react'

export default function OverflowTagList({ tags, allTags }) {
  const ref = useRef(null)
  const [cutoff, setCutoff] = useState(null)
  const sorted = [...tags].sort((a, b) => {
    const la = allTags.find(t => t.tag === a)?.label ?? a
    const lb = allTags.find(t => t.tag === b)?.label ?? b
    return la.localeCompare(lb)
  })
  const tagsKey = sorted.join(',')

  // Step 1a: when tag content changes, reset so Step 2 re-measures
  useLayoutEffect(() => {
    setCutoff(null)
  }, [tagsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Step 1b: reset on container resize (window resize, grid reflow, card width change)
  useLayoutEffect(() => {
    const container = ref.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setCutoff(null))
    ro.observe(container)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Step 2: when cutoff is null, render all tags and measure positions
  useLayoutEffect(() => {
    if (cutoff !== null) return  // already measured — exit to prevent loop
    const container = ref.current
    if (!container) return
    const tagEls = Array.from(container.querySelectorAll('[data-tag-item]'))
    if (!tagEls.length) { setCutoff(sorted.length); return }

    const baseTop = tagEls[0].getBoundingClientRect().top
    let firstOverflow = tagEls.length
    for (let i = 0; i < tagEls.length; i++) {
      if (tagEls[i].getBoundingClientRect().top > baseTop + 2) {
        firstOverflow = i
        break
      }
    }

    // Pull back one slot to leave room for the badge
    setCutoff(
      firstOverflow < tagEls.length
        ? Math.max(0, firstOverflow - 1)
        : sorted.length
    )
  }, [cutoff]) // eslint-disable-line react-hooks/exhaustive-deps

  // While cutoff is null (measuring phase) show all tags so positions are accurate
  const visible = cutoff === null ? sorted : sorted.slice(0, cutoff)
  const hiddenCount = cutoff !== null && cutoff < sorted.length ? sorted.length - cutoff : 0

  return (
    <div ref={ref} className="recipe-tags">
      {visible.map(tag => {
        const def = allTags.find(t => t.tag === tag)
        if (!def) return null
        return (
          <span key={tag} data-tag-item className="rtag"
            style={{ background: def.color.bg, color: def.color.text }}>
            {def.label}
          </span>
        )
      })}
      {hiddenCount > 0 && (
        <span className="rtag tag-overflow">+{hiddenCount}</span>
      )}
    </div>
  )
}
