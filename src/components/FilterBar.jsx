import AuthButton from './AuthButton.jsx'

const SORT_OPTIONS = [
  { value: 'alpha',        label: 'A → Z' },
  { value: 'cal-asc',      label: 'Calories: low → high' },
  { value: 'cal-desc',     label: 'Calories: high → low' },
  { value: 'protein-desc', label: 'Protein: high → low' },
  { value: 'fiber-desc',   label: 'Fiber: high → low' },
  { value: 'fat-asc',      label: 'Fat: low → high' },
  { value: 'date-desc',    label: 'Date added: newest' },
  { value: 'custom',       label: 'Custom order' },
]

export default function FilterBar({
  allTags, activeTag, onTagChange,
  searchQuery, onSearchChange,
  sortBy, onSortChange,
  onAddRecipe, onImportRecipe,
  groceryCount, onOpenGrocery,
  onOpenSettings,
  authUser, authLoading, onSignIn, onSignOut,
}) {
  return (
    <div className="filter-bar">
      <div className="filter-bar-top">
        <div>
          <div className="filter-label">Filter by tag</div>
          <div className="filter-tags">
            <span
              className={`ftag${activeTag === 'all' ? ' active' : ''}`}
              data-tag="all"
              onClick={() => onTagChange('all')}
            >
              <span className="dot" />
              All recipes
            </span>
            {allTags.map(({ tag, label, color }) => {
              const isActive = activeTag === tag
              return (
                <span
                  key={tag}
                  className={`ftag${isActive ? ' active' : ''}`}
                  style={isActive
                    ? { background: color.text, color: 'white', borderColor: color.text }
                    : { color: color.text, borderColor: color.bg }
                  }
                  onClick={() => onTagChange(tag)}
                >
                  <span className="dot" />
                  {label}
                </span>
              )
            })}
          </div>
        </div>
        <div className="filter-bar-actions">
          <AuthButton user={authUser} authLoading={authLoading} onSignIn={onSignIn} onSignOut={onSignOut} />
          <button className="grocery-btn" onClick={onOpenGrocery}>
            Grocery list{groceryCount > 0 ? ` (${groceryCount})` : ''}
          </button>
          <button className="import-recipe-btn" onClick={onImportRecipe}>Import</button>
          <button className="add-recipe-btn" onClick={onAddRecipe}>+ Add Recipe</button>
          <button className="settings-btn" onClick={onOpenSettings} title="Settings">⚙</button>
        </div>
      </div>
      <div className="search-row">
        <input
          type="text"
          className="search-input"
          placeholder="Search recipes, ingredients..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
        <select
          className="sort-select"
          value={sortBy}
          onChange={e => onSortChange(e.target.value)}
          aria-label="Sort recipes"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
