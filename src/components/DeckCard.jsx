export default function DeckCard({ recipe, allTags, focused, onFocus, onOpenDetail, headerRef }) {
  function handleClick() {
    if (focused) onOpenDetail()
    else onFocus()
  }

  return (
    <div
      className={`deck-card${focused ? ' deck-card--focused' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <div className="deck-card-header" ref={headerRef} data-recipe-id={recipe.id}>
        <h2 className="deck-card-title">{recipe.title}</h2>
      </div>
      <div className="deck-card-body">
        <p className="recipe-card-desc">{recipe.description}</p>
        <div className="recipe-tags">
          {recipe.tags.map(tag => {
            const def = allTags.find(t => t.tag === tag)
            return def
              ? <span key={tag} className="rtag" style={{ background: def.color.bg, color: def.color.text }}>{def.label}</span>
              : null
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
    </div>
  )
}
