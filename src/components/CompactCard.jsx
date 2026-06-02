export default function CompactCard({ recipe, allTags, expanded, onExpand, onOpenDetail }) {
  function handleClick() {
    if (expanded) onOpenDetail()
    else onExpand()
  }

  return (
    <div
      className={`compact-card${expanded ? ' compact-card--expanded' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <h2 className="compact-card-title">{recipe.title}</h2>
      <div className="compact-card-body">
        <p className="recipe-card-desc">{recipe.description}</p>
        <div className="recipe-tags">
          {recipe.tags.map(tag => {
            const def = allTags.find(t => t.tag === tag)
            return def
              ? <span key={tag} className="rtag" style={{ background: def.color.bg, color: def.color.text }}>{def.label}</span>
              : null
          })}
        </div>
      </div>
      <div className="compact-card-stats">
        {recipe.stats.map((stat, i) => (
          <div key={i} className={`stat stat--sm${stat.colorClass ? ' ' + stat.colorClass : ''}`}>
            <span className="stat-val">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
