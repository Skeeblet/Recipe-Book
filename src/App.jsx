import { useState } from 'react'
import Cover from './components/Cover.jsx'
import FilterBar from './components/FilterBar.jsx'
import RecipeCard from './components/RecipeCard.jsx'
import RecipeDetail from './components/RecipeDetail.jsx'
import RecipeForm from './components/RecipeForm.jsx'
import GroceryList from './components/GroceryList.jsx'
import ImportRecipeModal from './components/ImportRecipeModal.jsx'
import Settings from './components/Settings.jsx'
import { useRecipes } from './hooks/useRecipes.js'
import { useTags } from './hooks/useTags.js'
import { useGroceryList } from './hooks/useGroceryList.js'
import { useSettings } from './hooks/useSettings.js'
import { useCardOrder } from './hooks/useCardOrder.js'

function parseStatValue(recipe, labelKeyword) {
  const stat = recipe.stats.find(s => s.label.toLowerCase().includes(labelKeyword))
  return stat ? parseFloat(stat.value.replace(/[^0-9.]/g, '')) || 0 : 0
}

function sortRecipes(recipes, sortBy, customOrder = []) {
  const r = [...recipes]
  switch (sortBy) {
    case 'alpha':
      return r.sort((a, b) => a.title.localeCompare(b.title))
    case 'cal-asc':
      return r.sort((a, b) => parseStatValue(a, 'cal') - parseStatValue(b, 'cal'))
    case 'cal-desc':
      return r.sort((a, b) => parseStatValue(b, 'cal') - parseStatValue(a, 'cal'))
    case 'protein-desc':
      return r.sort((a, b) => parseStatValue(b, 'protein') - parseStatValue(a, 'protein'))
    case 'fiber-desc':
      return r.sort((a, b) => parseStatValue(b, 'fiber') - parseStatValue(a, 'fiber'))
    case 'fat-asc':
      return r.sort((a, b) => parseStatValue(a, 'fat') - parseStatValue(b, 'fat'))
    case 'date-desc':
      return r.sort((a, b) => {
        if (a.isUserAdded && !b.isUserAdded) return -1
        if (!a.isUserAdded && b.isUserAdded) return 1
        if (a.isUserAdded && b.isUserAdded)
          return parseInt(b.id.replace('user-', '')) - parseInt(a.id.replace('user-', ''))
        return parseInt(a.num) - parseInt(b.num)
      })
    case 'custom': {
      const posMap = new Map(customOrder.map((id, i) => [id, i]))
      return r.sort((a, b) => {
        const ai = posMap.has(a.id) ? posMap.get(a.id) : Infinity
        const bi = posMap.has(b.id) ? posMap.get(b.id) : Infinity
        return ai - bi
      })
    }
    default:
      return r
  }
}

export default function App() {
  const { recipes, addRecipe, updateRecipe, deleteRecipe } = useRecipes()
  const { allTags, customTags, addTag, editTag, deleteTag } = useTags()
  const { items: groceryItems, addIngredients, addItem, updateItem, toggleItem, removeItem, clearChecked } = useGroceryList()
  const { settings, set: setSetting } = useSettings()
  const { order: cardOrder, reorder, appendNew, removeId, initOrderExact } = useCardOrder()

  const [activeTag, setActiveTag] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('alpha')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [printRecipeId, setPrintRecipeId] = useState(null)
  const [formState, setFormState] = useState({ open: false, recipe: null })
  const [groceryOpen, setGroceryOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Drag state
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  function matchesFilters(recipe) {
    const matchesTag = activeTag === 'all' || recipe.tags.includes(activeTag)
    if (!matchesTag) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      recipe.title.toLowerCase().includes(q) ||
      recipe.description.toLowerCase().includes(q) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(q))
    )
  }

  const filteredRecipes = sortRecipes(recipes.filter(matchesFilters), sortBy, cardOrder)

  function handlePrint(recipeId) {
    setPrintRecipeId(recipeId)
    setTimeout(() => {
      window.print()
      setPrintRecipeId(null)
    }, 50)
  }

  function handleFormSubmit(data) {
    if (formState.recipe) {
      updateRecipe(formState.recipe.id, data)
      setSelectedRecipe(r => r ? { ...r, ...data } : r)
    } else {
      const id = 'user-' + Date.now()
      addRecipe({ ...data, id })
      appendNew(id)
    }
    setFormState({ open: false, recipe: null })
    setSettingsOpen(false)
  }

  function handleImport(data) {
    const id = 'user-' + Date.now()
    addRecipe({ ...data, id })
    appendNew(id)
    setImportOpen(false)
  }

  function handleDelete(id) {
    deleteRecipe(id)
    removeId(id)
    if (selectedRecipe?.id === id) setSelectedRecipe(null)
  }

  // Drag handlers
  function handleDragStart(id) {
    // Snapshot current order from the currently displayed order
    const currentIds = sortRecipes(recipes, sortBy, cardOrder).map(r => r.id)
    initOrderExact(currentIds)
    setSortBy('custom')
    setDraggingId(id)
  }

  function handleDragOver(id) {
    if (id !== draggingId) setDragOverId(id)
  }

  function handleDrop(toId) {
    if (draggingId && toId !== draggingId) reorder(draggingId, toId)
    setDraggingId(null)
    setDragOverId(null)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverId(null)
  }

  const uncheckedGroceryCount = groceryItems.filter(i => !i.checked).length

  return (
    <>
      <Cover totalRecipes={recipes.length} />
      <FilterBar
        allTags={allTags}
        activeTag={activeTag}
        onTagChange={setActiveTag}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onAddRecipe={() => setFormState({ open: true, recipe: null })}
        onImportRecipe={() => setImportOpen(true)}
        groceryCount={uncheckedGroceryCount}
        onOpenGrocery={() => setGroceryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="recipes-container">
        {filteredRecipes.length === 0
          ? <div className="empty-state visible">No recipes match that filter.</div>
          : <div className="recipe-grid">
              {filteredRecipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  allTags={allTags}
                  onClick={() => setSelectedRecipe(recipe)}
                  isDragging={draggingId === recipe.id}
                  isDragOver={dragOverId === recipe.id}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
        }
      </div>
      <footer>My Meal Prep Recipe Book &nbsp;·&nbsp; 1,200 cal/day plan &nbsp;·&nbsp; Built with Claude</footer>

      {selectedRecipe && (
        <RecipeDetail
          key={selectedRecipe.id}
          recipe={selectedRecipe}
          allTags={allTags}
          isPrinting={printRecipeId === selectedRecipe.id}
          smartUnits={settings.smartUnits}
          onBack={() => setSelectedRecipe(null)}
          onPrint={() => handlePrint(selectedRecipe.id)}
          onEdit={() => setFormState({ open: true, recipe: selectedRecipe })}
          onDelete={() => handleDelete(selectedRecipe.id)}
          onAddIngredients={(recipe) => { addIngredients(recipe); setGroceryOpen(true) }}
          onAddItem={(name, amount, recipeTitle) => { addItem(name, amount, recipeTitle); setGroceryOpen(true) }}
        />
      )}

      {settingsOpen && (
        <Settings
          allTags={allTags}
          customTags={customTags}
          recipes={recipes}
          settings={settings}
          onSettingChange={setSetting}
          onEditTag={editTag}
          onDeleteTag={(slug) => {
            // Remove tag from all recipes that use it
            recipes.forEach(r => {
              if (r.tags.includes(slug)) {
                updateRecipe(r.id, { ...r, tags: r.tags.filter(t => t !== slug) })
              }
            })
            deleteTag(slug)
          }}
          onEditRecipe={(recipe) => setFormState({ open: true, recipe })}
          onDeleteRecipe={(id) => handleDelete(id)}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {groceryOpen && (
        <GroceryList
          items={groceryItems}
          onToggle={toggleItem}
          onRemove={removeItem}
          onUpdate={updateItem}
          onClearChecked={clearChecked}
          onClose={() => setGroceryOpen(false)}
        />
      )}

      {formState.open && (
        <RecipeForm
          recipe={formState.recipe}
          allTags={allTags}
          onAddTag={addTag}
          onSubmit={handleFormSubmit}
          onClose={() => setFormState({ open: false, recipe: null })}
        />
      )}

      {importOpen && (
        <ImportRecipeModal
          allTags={allTags}
          onAddTag={addTag}
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      )}
    </>
  )
}
