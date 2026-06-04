import { useRef } from 'react'
import OverflowTagList from './OverflowTagList.jsx'

export default function RecipeCard({
  recipe, allTags, onClick, onShare,
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
      <div className="recipe-card-header">
        <button
          className="recipe-card-share-btn"
          title="Share recipe"
          onClick={onShare}
          onMouseDown={e => e.stopPropagation()}
        >
          <svg viewBox="0 0 22 22" width="16" height="16" fill="none" stroke="currentColor"
               strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="17" cy="5" r="2" />
            <circle cx="5" cy="11" r="2" />
            <circle cx="17" cy="17" r="2" />
            <line x1="7" y1="10" x2="15" y2="6" />
            <line x1="7" y1="12" x2="15" y2="16" />
          </svg>
        </button>
        <h2 className="recipe-card-title">{recipe.title}</h2>
        <div className="recipe-desc-row">
          <p className="recipe-card-desc">{recipe.description}</p>
          {recipe.estimatedTime && (
            <div className="recipe-time-badge">⏱ {recipe.estimatedTime}</div>
          )}
        </div>
      </div>
      <div className="recipe-card-body">
        <OverflowTagList tags={recipe.tags} allTags={allTags} />
        <div className="recipe-card-stats">
          {recipe.stats.filter(s => s.value?.toString().trim()).map((stat, i) => (
            <div key={i}
              className={`stat${!stat.color && stat.colorClass ? ' ' + stat.colorClass : ''}`}
              style={stat.color ? { background: stat.color.bg } : {}}
            >
              <span className="stat-val" style={stat.color ? { color: stat.color.text } : {}}>{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
        <div className="recipe-card-arrow">View recipe →</div>
      </div>
    </div>
  )
}
