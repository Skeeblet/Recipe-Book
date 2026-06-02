import { useState, useEffect, useRef } from 'react'
import DeckCard from './DeckCard.jsx'

export default function DeckGrid({ recipes, allTags, onOpenRecipe }) {
  const [focusedId, setFocusedId] = useState(recipes[0]?.id ?? null)
  const headerRefs = useRef({})

  useEffect(() => {
    if (window.innerWidth > 768) return  // desktop uses CSS :hover only

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setFocusedId(entry.target.dataset.recipeId)
          // Disconnect immediately to prevent layout-shift cascade as the
          // newly expanded card pushes others around. Reconnect after the
          // CSS transition finishes (400ms).
          obs.disconnect()
          setTimeout(() => {
            Object.values(headerRefs.current).forEach(el => { if (el) obs.observe(el) })
          }, 400)
        }
      })
    }, { threshold: 0.8, rootMargin: '-15% 0px -55% 0px' })

    Object.values(headerRefs.current).forEach(el => { if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [recipes])

  return (
    <div className="recipe-deck">
      {recipes.map(recipe => (
        <DeckCard
          key={recipe.id}
          recipe={recipe}
          allTags={allTags}
          focused={focusedId === recipe.id}
          onFocus={() => setFocusedId(recipe.id)}
          onOpenDetail={() => onOpenRecipe(recipe)}
          headerRef={el => { headerRefs.current[recipe.id] = el }}
        />
      ))}
    </div>
  )
}
