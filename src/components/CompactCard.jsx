import OverflowTagList from './OverflowTagList.jsx'

export default function CompactCard({ recipe, allTags, onClick }) {
  return (
    <div
      className="compact-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <h2 className="compact-card-title">{recipe.title}</h2>
      <div className="compact-card-body">
        <div className="recipe-desc-row">
          <p className="recipe-card-desc">{recipe.description}</p>
          {recipe.estimatedTime && (
            <div className="recipe-time-badge">⏱ {recipe.estimatedTime}</div>
          )}
        </div>
        <OverflowTagList tags={recipe.tags} allTags={allTags} />
      </div>
      <div className="compact-card-stats">
        {recipe.stats.filter(s => s.value?.toString().trim()).map((stat, i) => (
          <div key={i}
            className={`stat stat--sm${!stat.color && stat.colorClass ? ' ' + stat.colorClass : ''}`}
            style={stat.color ? { background: stat.color.bg } : {}}
          >
            <span className="stat-val" style={stat.color ? { color: stat.color.text } : {}}>{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
