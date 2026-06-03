import { useState, useEffect, useRef } from 'react'
import Cover from './components/Cover.jsx'
import FilterBar from './components/FilterBar.jsx'
import RecipeCard from './components/RecipeCard.jsx'
import RecipeDetail from './components/RecipeDetail.jsx'
import RecipeForm from './components/RecipeForm.jsx'
import GroceryList from './components/GroceryList.jsx'
import ImportRecipeModal from './components/ImportRecipeModal.jsx'
import Settings from './components/Settings.jsx'
import AuthButton from './components/AuthButton.jsx'
import ConflictModal from './components/ConflictModal.jsx'
import UpdateToast from './components/UpdateToast.jsx'
import BottomNav from './components/BottomNav.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import CompactCard from './components/CompactCard.jsx'
import DeckGrid from './components/DeckGrid.jsx'
import RecipeListEnd from './components/RecipeListEnd.jsx'
import { usePWAUpdate } from './hooks/usePWAUpdate.js'
import { useRecipes } from './hooks/useRecipes.js'
import { useTags } from './hooks/useTags.js'
import { useGroceryList } from './hooks/useGroceryList.js'
import { useSettings } from './hooks/useSettings.js'
import { useCardOrder } from './hooks/useCardOrder.js'
import { useAuth } from './hooks/useAuth.js'
import { useFirestoreSync } from './hooks/useFirestoreSync.js'
import { db } from './firebase/config.js'
import {
  pullAllUserData,
  seedFirestore,
  writeRecipe,
  deleteRecipeDoc,
  deleteGroceryItemDoc,
  deleteTagDoc,
} from './firebase/firestoreAdapter.js'

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
  const { user, authLoading, signIn, signOut } = useAuth()
  const { updateAvailable, applyUpdate } = usePWAUpdate()
  const { recipes, addRecipe, updateRecipe, deleteRecipe, replaceAll: replaceRecipes } = useRecipes()
  const { allTags, customTags, addTag, editTag, deleteTag, replaceAll: replaceTags } = useTags()
  const { items: groceryItems, addIngredients, addItem, updateItem, toggleItem, removeItem, clearChecked, replaceAll: replaceGrocery } = useGroceryList()
  const { settings, set: setSetting, replaceAll: replaceSettings } = useSettings()
  const { order: cardOrder, reorder, appendNew, removeId, initOrderExact, replaceAll: replaceCardOrder } = useCardOrder()
  const [conflicts, setConflicts] = useState([])

  useFirestoreSync(user?.uid ?? null, { recipes, groceryItems, customTags, settings, cardOrder })

  // Sign-in merge: seed on first sign-in, or merge cloud data with local
  useEffect(() => {
    if (authLoading || !user) return
    pullAllUserData(db, user.uid).then(data => {
      const hasCloudData = data.recipes?.length || data.groceryList?.length || data.tags?.length

      if (!hasCloudData) {
        seedFirestore(db, user.uid, {
          recipes: recipes.filter(r => r.isUserAdded),
          groceryList: groceryItems,
          tags: customTags,
          settings,
          cardOrder,
        }).catch(console.error)
        return
      }

      const cloudIds = new Set((data.recipes || []).map(r => r.id))
      const localOnly = recipes.filter(r => r.isUserAdded && !cloudIds.has(r.id))

      replaceRecipes([
        ...recipes.filter(r => !r.isUserAdded),
        ...(data.recipes || []),
      ])

      if (data.groceryList?.length) {
        const localIds = new Set(groceryItems.map(i => String(i.id)))
        const cloudOnly = data.groceryList.filter(i => !localIds.has(String(i.id)))
        if (cloudOnly.length) replaceGrocery([...groceryItems, ...cloudOnly])
      }

      if (data.tags?.length) replaceTags(data.tags)
      if (data.settings) replaceSettings(data.settings)
      if (data.cardOrder) replaceCardOrder(data.cardOrder)
      if (localOnly.length) setConflicts(localOnly)
    }).catch(console.error)
  }, [user?.uid, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const [activeTags, setActiveTags] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('alpha')
  const [selectedRecipe, setSelectedRecipe] = useState(null)

  // Push a history entry when detail opens so the browser back button closes it
  useEffect(() => {
    if (!selectedRecipe) return
    window.history.pushState({ recipeDetail: true }, '')
    function onPopState() { setSelectedRecipe(null) }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [!!selectedRecipe]) // eslint-disable-line react-hooks/exhaustive-deps

  const [printRecipeId, setPrintRecipeId] = useState(null)
  const [formState, setFormState] = useState({ open: false, recipe: null })
  const [groceryOpen, setGroceryOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState('recipes')


  // Drag state
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  function toggleTag(tag) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function matchesFilters(recipe) {
    const matchesTag = activeTags.length === 0 || activeTags.every(t => recipe.tags.includes(t))
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

  function handleConflictResolve(recipe, action) {
    if (action === 'keep') {
      writeRecipe(db, user.uid, recipe).catch(console.error)
    } else {
      deleteRecipe(recipe.id)
      removeId(recipe.id)
    }
    setConflicts(prev => prev.filter(r => r.id !== recipe.id))
  }

  function handleDelete(id) {
    deleteRecipe(id)
    removeId(id)
    if (selectedRecipe?.id === id) window.history.back()  // popstate listener closes detail
    if (user) deleteRecipeDoc(db, user.uid, id).catch(console.error)
  }

  function handleRemoveGroceryItem(id) {
    removeItem(id)
    if (user) deleteGroceryItemDoc(db, user.uid, id).catch(console.error)
  }

  function handleClearChecked() {
    const idsToDelete = groceryItems.filter(i => i.checked).map(i => i.id)
    clearChecked()
    if (user) idsToDelete.forEach(id => deleteGroceryItemDoc(db, user.uid, id).catch(console.error))
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
      {mobileTab === 'recipes' && (
        <FilterBar
          allTags={allTags}
          activeTags={activeTags}
          onTagChange={toggleTag}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onAddRecipe={() => setFormState({ open: true, recipe: null })}
          onImportRecipe={() => setImportOpen(true)}
          groceryCount={uncheckedGroceryCount}
          onOpenGrocery={() => setGroceryOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          authUser={user}
          authLoading={authLoading}
          onSignIn={signIn}
          onSignOut={signOut}
          cardMode={settings.cardMode}
          onCardModeChange={mode => setSetting('cardMode', mode)}
        />
      )}
      <div className={`recipes-container${mobileTab !== 'recipes' ? ' hide-mobile' : ''}`}>
        {filteredRecipes.length === 0 ? (
          <div className="empty-state visible">No recipes match that filter.</div>
        ) : settings.cardMode === 'compact' ? (
          <>
            <div className="recipe-grid recipe-grid--compact">
              {filteredRecipes.map(recipe => (
                <CompactCard
                  key={recipe.id}
                  recipe={recipe}
                  allTags={allTags}
                  onClick={() => setSelectedRecipe(recipe)}
                />
              ))}
            </div>
            <RecipeListEnd />
          </>
        ) : settings.cardMode === 'deck' ? (
          <DeckGrid
            recipes={filteredRecipes}
            allTags={allTags}
            onOpenRecipe={setSelectedRecipe}
          />
        ) : (
          <>
            <div className="recipe-grid">
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
            <RecipeListEnd />
          </>
        )}
      </div>
      <footer>My Meal Prep Recipe Box &nbsp;·&nbsp; 1,200 cal/day plan &nbsp;·&nbsp; Built with Claude</footer>

      {selectedRecipe && (
        <RecipeDetail
          key={selectedRecipe.id}
          recipe={selectedRecipe}
          allTags={allTags}
          isPrinting={printRecipeId === selectedRecipe.id}
          smartUnits={settings.smartUnits}
          onBack={() => window.history.back()}
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
            recipes.forEach(r => {
              if (r.tags.includes(slug)) {
                updateRecipe(r.id, { ...r, tags: r.tags.filter(t => t !== slug) })
              }
            })
            deleteTag(slug)
            if (user) deleteTagDoc(db, user.uid, slug).catch(console.error)
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
          onRemove={handleRemoveGroceryItem}
          onUpdate={updateItem}
          onClearChecked={handleClearChecked}
          onClose={() => setGroceryOpen(false)}
        />
      )}

      {mobileTab === 'grocery' && (
        <GroceryList
          items={groceryItems}
          onToggle={toggleItem}
          onRemove={handleRemoveGroceryItem}
          onUpdate={updateItem}
          onClearChecked={handleClearChecked}
          isFullPage={true}
        />
      )}

      {mobileTab === 'profile' && (
        <ProfilePage
          user={user}
          authLoading={authLoading}
          onSignIn={signIn}
          onSignOut={signOut}
          cardMode={settings.cardMode}
          onCardModeChange={mode => setSetting('cardMode', mode)}
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

      {conflicts.length > 0 && (
        <ConflictModal conflicts={conflicts} onResolve={handleConflictResolve} />
      )}

      <UpdateToast visible={updateAvailable} onApply={applyUpdate} />

      <BottomNav
        activeTab={mobileTab}
        onTabChange={setMobileTab}
        groceryCount={uncheckedGroceryCount}
      />
    </>
  )
}
