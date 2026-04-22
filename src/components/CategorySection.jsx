import RecipeCard from './RecipeCard.jsx'

export default function CategorySection({ category, recipes, onSelect }) {
  if (recipes.length === 0) return null

  return (
    <div className="category-section">
      <div className="category-header">
        <span className="category-icon">{category.icon}</span>
        <span className="category-title">{category.label}</span>
        <span className="category-count">
          {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
        </span>
      </div>
      <div className="recipe-grid">
        {recipes.map(recipe => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onClick={() => onSelect(recipe)}
          />
        ))}
      </div>
    </div>
  )
}
