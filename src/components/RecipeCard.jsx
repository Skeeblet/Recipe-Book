import { useRef } from 'react'

export default function RecipeCard({
  recipe, allTags, onClick,
  onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver,
}) {
  const didDrag = useRef(false)

  function handleDragStart(e) {
    didDrag.current = true
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(recipe.id)
  }

  function handleDragEnd() {
    setTimeout(() => { didDrag.current = false }, 50)
    onDragEnd()
  }

  function handleClick() {
    if (didDrag.current) return
    onClick()
  }

  return (
    <div
      className={`recipe-card${isDragging ? ' dragging' : ''}${isDragOver ? ' drag-over' : ''}`}
      role="button"
      tabIndex={0}
      draggable
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      onDragStart={handleDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(recipe.id) }}
      onDrop={e => { e.preventDefault(); onDrop(recipe.id) }}
      onDragEnd={handleDragEnd}
    >
      <h2 className="recipe-card-title">{recipe.title}</h2>
      <p className="recipe-card-desc">{recipe.description}</p>
      <div className="recipe-tags">
        {recipe.tags.map(tag => {
          const def = allTags.find(t => t.tag === tag)
          if (!def) return null
          return (
            <span key={tag} className="rtag" style={{ background: def.color.bg, color: def.color.text }}>
              {def.label}
            </span>
          )
        })}
      </div>
      <div className="recipe-card-stats">
        {recipe.stats.map((stat, i) => (
          <div key={i} className={`stat${stat.colorClass ? ' ' + stat.colorClass : ''}`}>
            <span className="stat-val">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
      <div className="recipe-card-arrow">View recipe →</div>
    </div>
  )
}
