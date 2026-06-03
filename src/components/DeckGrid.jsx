import { useState, useEffect, useRef } from 'react'
import DeckCard from './DeckCard.jsx'

export default function DeckGrid({ recipes, allTags, onOpenRecipe }) {
  const [activeId, setActiveId] = useState(recipes[0]?.id ?? null)
  const cardRefs = useRef({})

  // On mount: center the first card instantly
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = cardRefs.current[recipes[0]?.id]
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function detectActive() {
    const mid = window.innerHeight / 2
    let bestId = null, bestDist = Infinity
    for (const [id, el] of Object.entries(cardRefs.current)) {
      if (!el) continue
      const { top, height } = el.getBoundingClientRect()
      const dist = Math.abs(top + height / 2 - mid)
      if (dist < bestDist) { bestDist = dist; bestId = id }
    }
    if (bestId) setActiveId(prev => prev !== bestId ? bestId : prev)
  }

  // Scroll listener: card whose center is closest to viewport midpoint is active
  useEffect(() => {
    function onScroll() { detectActive() }
    window.addEventListener('scroll', onScroll, { passive: true })
    detectActive()
    return () => window.removeEventListener('scroll', onScroll)
  }, [recipes]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="recipe-deck">
      {recipes.map(recipe => (
        <DeckCard
          key={recipe.id}
          recipe={recipe}
          allTags={allTags}
          active={activeId === recipe.id}
          onOpenDetail={() => onOpenRecipe(recipe)}
          cardRef={el => { cardRefs.current[recipe.id] = el }}
        />
      ))}
    </div>
  )
}
