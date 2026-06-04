import OverflowTagList from './OverflowTagList.jsx'

export default function DeckCard({ recipe, allTags, active, onOpenDetail, cardRef }) {
  return (
    <div
      ref={cardRef}
      className={`deck-card${active ? ' deck-card--active' : ''}`}
      onClick={onOpenDetail}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onOpenDetail()}
    >
      <div className="deck-card-header">
        <h2 className="deck-card-title">{recipe.title}</h2>
        <div className="recipe-desc-row">
          <p className="recipe-card-desc">{recipe.description}</p>
          {recipe.estimatedTime && (
            <div className="recipe-time-badge">⏱ {recipe.estimatedTime}</div>
          )}
        </div>
      </div>
      <div className="deck-card-body">
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
