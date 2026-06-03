import { useState, useEffect, useRef } from 'react'
import DeckCard from './DeckCard.jsx'
import RecipeListEnd from './RecipeListEnd.jsx'

// Must match CSS scroll-padding-top on .recipe-deck
const SNAP_OFFSET = 75

export default function DeckGrid({ recipes, allTags, onOpenRecipe }) {
  const [activeId, setActiveId] = useState(recipes[0]?.id ?? null)
  const containerRef = useRef(null)
  const cardRefs = useRef({})

  // On mount: scroll container to 0 so the first card sits at the snap position
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Detect which card is currently snapped.
  // Uses el.offsetTop (layout position, unaffected by CSS transform) so the
  // transform: translateY(186px) on the active card's sibling doesn't fool us.
  function detectActive() {
    const container = containerRef.current
    if (!container) return
    // In the container's coordinate space: snap position = scrollTop + SNAP_OFFSET
    const snapPos = container.scrollTop + SNAP_OFFSET
    let bestId = null, bestDist = Infinity
    for (const [id, el] of Object.entries(cardRefs.current)) {
      if (!el) continue
      const dist = Math.abs(el.offsetTop - snapPos)
      if (dist < bestDist) { bestDist = dist; bestId = id }
    }
    if (bestId) setActiveId(prev => prev !== bestId ? bestId : prev)
  }

  // Listen on the container's own scroll, not window
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function onScroll() { detectActive() }
    container.addEventListener('scroll', onScroll, { passive: true })
    detectActive()
    return () => container.removeEventListener('scroll', onScroll)
  }, [recipes]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} className="recipe-deck">
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

      <RecipeListEnd />
    </div>
  )
}
