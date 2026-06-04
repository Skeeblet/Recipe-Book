import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import DeckCard from './DeckCard.jsx'
import RecipeListEnd from './RecipeListEnd.jsx'

// How far from the container's top edge the active card is detected.
// Matches the padding-top on .recipe-deck in CSS.
const ACTIVE_OFFSET = 80

// Pixels of each card's header that remain visible above the next card in the stack.
const DECK_PEEK = 80

export default function DeckGrid({ recipes, allTags, onOpenRecipe }) {
  const [activeId, setActiveId] = useState(recipes[0]?.id ?? null)
  const containerRef = useRef(null)
  const cardRefs    = useRef({})
  const endRef      = useRef(null)

  // Read all card heights in one pass first, then write margins — interleaving
  // reads and writes causes the browser to recompute layout mid-loop, producing
  // stale values. Batch reads → batch writes to get correct measurements.
  useLayoutEffect(() => {
    const heights = recipes.map(r => cardRefs.current[r.id]?.offsetHeight ?? 0)
    recipes.forEach((recipe, i) => {
      const el = cardRefs.current[recipe.id]
      if (!el) return
      el.style.marginTop = i === 0 ? '' : `${-heights[i - 1] + DECK_PEEK}px`
    })
  }, [recipes])

  // Set --active-card-height on the container so subsequent cards and the deck
  // end element translate the right distance to reveal the full active card.
  // Also trigger the exit animation on the card that was previously behind the
  // active card — CSS can't animate the removal of :has(+ .deck-card--active),
  // so we add a class before paint to play the reverse animation manually.
  const prevActiveIdRef = useRef(null)
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !activeId) return
    const el = cardRefs.current[activeId]
    if (el) container.style.setProperty('--active-card-height', el.offsetHeight + 'px')

    const prevId = prevActiveIdRef.current
    prevActiveIdRef.current = activeId
    if (prevId && prevId !== activeId) {
      const prevIdx = recipes.findIndex(r => r.id === prevId)
      const behindRecipe = prevIdx > 0 ? recipes[prevIdx - 1] : null
      const behindEl = behindRecipe && behindRecipe.id !== activeId
        ? cardRefs.current[behindRecipe.id]
        : null
      if (behindEl) {
        behindEl.classList.add('deck-card--peek-exit')
        behindEl.addEventListener('animationend', () => {
          behindEl.classList.remove('deck-card--peek-exit')
        }, { once: true })
      }
    }
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set padding-bottom so the scroll range ends exactly when the last card
  // reaches the active position. We avoid reading container.scrollHeight because
  // Chrome inflates it when child elements have CSS transforms applied, giving
  // an incorrect value. Instead we build the layout height from offsetTop/offsetHeight
  // directly — these are layout coordinates unaffected by transforms.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.scrollTop = 0

    const lastEl  = cardRefs.current[recipes[recipes.length - 1]?.id]
    const endEl   = endRef.current
    if (!lastEl) return

    const filterBarH  = 52
    const bottomNavH  = 64
    const containerH  = window.innerHeight - filterBarH - bottomNavH

    // Layout height = padding-top already baked into offsetTop + last card height + end element
    const layoutContent = lastEl.offsetTop + lastEl.offsetHeight + (endEl?.offsetHeight ?? 0)

    // We want: max scrollTop = lastEl.offsetTop - ACTIVE_OFFSET
    // So:      scrollHeight  = (lastEl.offsetTop - ACTIVE_OFFSET) + containerH
    const targetScrollH = lastEl.offsetTop - ACTIVE_OFFSET + containerH
    const pb = Math.max(targetScrollH - layoutContent, 0)
    container.style.paddingBottom = `${pb}px`
  }, [recipes]) // eslint-disable-line react-hooks/exhaustive-deps

  function detectActive() {
    const container = containerRef.current
    if (!container) return
    const snapPos = container.scrollTop + ACTIVE_OFFSET
    let bestId = null, bestDist = Infinity
    for (const [id, el] of Object.entries(cardRefs.current)) {
      if (!el) continue
      const dist = Math.abs(el.offsetTop - snapPos)
      if (dist < bestDist) { bestDist = dist; bestId = id }
    }
    if (bestId) setActiveId(prev => prev !== bestId ? bestId : prev)
  }

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
      <div ref={endRef}>
        <RecipeListEnd />
      </div>
    </div>
  )
}
