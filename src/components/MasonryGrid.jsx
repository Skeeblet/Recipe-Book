import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import CompactCard from './CompactCard.jsx'

const GAP = 10

function getNumColumns(width) {
  if (width >= 1025) return 4
  if (width >= 769) return 3
  return 2
}

export default function MasonryGrid({ recipes, allTags, onCardClick }) {
  const containerRef = useRef(null)
  const measureRef = useRef(null)
  const [columnData, setColumnData] = useState([])

  const recompute = useCallback(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const containerWidth = container.offsetWidth
    const numCols = getNumColumns(containerWidth)
    const colWidth = Math.floor((containerWidth - (numCols - 1) * GAP) / numCols)

    measure.style.width = colWidth + 'px'

    const cards = Array.from(measure.children)
    const heights = new Array(numCols).fill(0)
    const columns = Array.from({ length: numCols }, () => [])

    cards.forEach((card, i) => {
      const minH = Math.min(...heights)
      const col = heights.indexOf(minH)
      columns[col].push(i)
      heights[col] += card.offsetHeight + GAP
    })

    setColumnData(columns)
  }, [])

  useLayoutEffect(() => {
    recompute()
  }, [recipes, recompute])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    let lastWidth = container.offsetWidth
    const ro = new ResizeObserver(entries => {
      const newWidth = entries[0].contentRect.width
      if (Math.round(newWidth) !== Math.round(lastWidth)) {
        lastWidth = newWidth
        recompute()
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [recompute])

  return (
    <div ref={containerRef} className="masonry-container">
      <div
        ref={measureRef}
        style={{ position: 'fixed', top: 0, left: '-99999px', visibility: 'hidden', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        {recipes.map(recipe => (
          <CompactCard key={recipe.id} recipe={recipe} allTags={allTags} onClick={() => {}} />
        ))}
      </div>
      <div className="masonry-grid">
        {columnData.map((indices, colIdx) => (
          <div key={colIdx} className="masonry-col">
            {indices.map(i => (
              <CompactCard
                key={recipes[i].id}
                recipe={recipes[i]}
                allTags={allTags}
                onClick={() => onCardClick(recipes[i])}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
