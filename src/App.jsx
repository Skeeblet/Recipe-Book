import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Cover from './components/Cover.jsx'
import FilterBar from './components/FilterBar.jsx'
import RecipeCard from './components/RecipeCard.jsx'
import RecipeDetail from './components/RecipeDetail.jsx'
import RecipeForm from './components/RecipeForm.jsx'
import GroceryList from './components/GroceryList.jsx'
import ImportModal from './components/ImportModal.jsx'
import Settings from './components/Settings.jsx'
import AuthButton from './components/AuthButton.jsx'
import ConflictModal from './components/ConflictModal.jsx'
import UpdateToast from './components/UpdateToast.jsx'
import ShareToast from './components/ShareToast.jsx'
import GroceryBulkToast from './components/GroceryBulkToast.jsx'
import BottomNav from './components/BottomNav.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import MasonryGrid from './components/MasonryGrid.jsx'
import DeckGrid from './components/DeckGrid.jsx'
import RecipeListEnd from './components/RecipeListEnd.jsx'
import WelcomeState from './components/WelcomeState.jsx'
import { usePWAUpdate } from './hooks/usePWAUpdate.js'
import { useRecipes } from './hooks/useRecipes.js'
import { useTags } from './hooks/useTags.js'
import { useGroceryList } from './hooks/useGroceryList.js'
import { useSettings } from './hooks/useSettings.js'
import { useCardOrder } from './hooks/useCardOrder.js'
import { useAuth } from './hooks/useAuth.js'
import { useFirestoreSync } from './hooks/useFirestoreSync.js'
import { db } from './firebase/config.js'
import { classifyBatchWithAI } from './utils/ingredientCategories.js'
import {
  pullAllUserData,
  seedFirestore,
  writeRecipe,
  deleteRecipeDoc,
  deleteGroceryItemDoc,
  deleteTagDoc,
  deleteAllUserData,
  fetchPublicRecipe,
  writePublicRecipe,
  writeDeletions,
} from './firebase/firestoreAdapter.js'
import { shareRecipe } from './utils/shareRecipe.js'
import { callAI, extractJson } from './utils/aiClient.js'
import { buildNutritionPrompt, parseNutritionResponse, mergeStats, normalizeStatLabel } from './utils/recipeAI.js'

function parseTimeToMinutes(str) {
  if (!str) return Infinity
  const s = str.toLowerCase()
  let total = 0
  const hr = s.match(/(\d+(?:\.\d+)?)\s*h/)
  if (hr) total += parseFloat(hr[1]) * 60
  const min = s.match(/(\d+(?:\.\d+)?)\s*m/)
  if (min) total += parseFloat(min[1])
  return total || Infinity
}

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
    case 'time-asc':
      return r.sort((a, b) => parseTimeToMinutes(a.estimatedTime) - parseTimeToMinutes(b.estimatedTime))
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
  const { updateAvailable, applyUpdate, checkForUpdate } = usePWAUpdate()
  const { recipes, addRecipe, updateRecipe, deleteRecipe, replaceAll: replaceRecipes } = useRecipes()
  const { allTags, customTags, addTag, editTag, deleteTag, replaceAll: replaceTags } = useTags()
  const { items: groceryItems, addIngredients, addItem, updateItem, updateItemCategory, toggleItem, removeItem, removeItems, clearChecked, clearAll, replaceAll: replaceGrocery } = useGroceryList()
  const { settings, set: setSetting, replaceAll: replaceSettings } = useSettings()
  const { order: cardOrder, reorder, appendNew, removeId, initOrderExact, replaceAll: replaceCardOrder } = useCardOrder()
  const [conflicts, setConflicts] = useState([])
  // Blocks cloud writes until the initial pull/merge finishes, so boot-time
  // local state can't be bulk-written over fresher cloud data.
  const [syncReady, setSyncReady] = useState(false)

  useFirestoreSync(user?.uid ?? null, syncReady, { recipes, groceryItems, customTags, settings, cardOrder })

  // Apply theme and font-size to document root
  useEffect(() => {
    const t = settings.theme || 'system'
    t === 'system'
      ? document.documentElement.removeAttribute('data-theme')
      : document.documentElement.setAttribute('data-theme', t)
  }, [settings.theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-fontsize', settings.fontSize || 'medium')
  }, [settings.fontSize])

  async function handleSignOut() {
    await signOut()
    // Account data must not linger on the device (it's safe in the cloud, and
    // a different account signing in here must not inherit it). Device prefs
    // ('app-settings', incl. the local AI key) stay.
    ;['user-recipes', 'custom-tags', 'grocery-list', 'card-order'].forEach(k =>
      localStorage.removeItem(k)
    )
    window.location.reload()
  }

  async function handleDeleteAccount() {
    if (user) await deleteAllUserData(db, user.uid).catch(console.error)
    await signOut()
    ;['app-settings', 'custom-tags', 'user-recipes', 'card-order', 'grocery-list'].forEach(k =>
      localStorage.removeItem(k)
    )
    window.location.reload()
  }

  // Sign-in merge: seed on first sign-in, or merge cloud data with local.
  // Deletion tombstones (users/{uid}/meta/deletions) distinguish recipes
  // deleted on another device from recipes created locally while offline.
  useEffect(() => {
    setSyncReady(false)
    if (authLoading || !user) return
    pullAllUserData(db, user.uid).then(data => {
      const tombRecipes = data.deletions?.recipes || {}
      const tombGrocery = data.deletions?.grocery || {}
      const hasTombstones =
        Object.keys(tombRecipes).length > 0 || Object.keys(tombGrocery).length > 0
      const hasCloudData = data.recipes?.length || data.groceryList?.length || data.tags?.length

      // Seed only on a genuinely fresh account — tombstones mean the account
      // has been used before (possibly emptied on purpose), so don't re-seed.
      if (!hasCloudData && !hasTombstones) {
        seedFirestore(db, user.uid, {
          recipes: recipes.filter(r => r.isUserAdded),
          groceryList: groceryItems,
          tags: customTags,
          settings,
          cardOrder,
        }).then(() => setSyncReady(true)).catch(console.error)
        return
      }

      // Drop tombstoned recipes even if their cloud doc lingers (e.g. the doc
      // delete was lost mid-flight), and clean those docs up in the background.
      const cloudRecipes = (data.recipes || []).filter(r => {
        if (!tombRecipes[String(r.id)]) return true
        deleteRecipeDoc(db, user.uid, r.id).catch(console.error)
        return false
      })

      const cloudIds = new Set(cloudRecipes.map(r => r.id))
      const localOnly = recipes.filter(
        r => r.isUserAdded && !cloudIds.has(r.id) && !tombRecipes[String(r.id)]
      )

      replaceRecipes(cloudRecipes)

      // Grocery: keep local items unless deleted elsewhere; add cloud-only ones.
      const localGroceryIds = new Set(groceryItems.map(i => String(i.id)))
      const keptLocal = groceryItems.filter(i => !tombGrocery[String(i.id)])
      const cloudOnly = (data.groceryList || []).filter(
        i => !localGroceryIds.has(String(i.id)) && !tombGrocery[String(i.id)]
      )
      if (keptLocal.length !== groceryItems.length || cloudOnly.length) {
        replaceGrocery([...keptLocal, ...cloudOnly])
      }

      if (data.tags?.length) replaceTags(data.tags)
      if (data.settings) replaceSettings(data.settings)
      if (data.cardOrder) replaceCardOrder(data.cardOrder)
      if (localOnly.length) setConflicts(localOnly)
      setSyncReady(true)
    }).catch(console.error)
  }, [user?.uid, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const [activeTags, setActiveTags] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('alpha')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [sharedRecipe, setSharedRecipe] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)
  const [bulkAddUndo, setBulkAddUndo] = useState(null)
  const deepLinkHandled = useRef(false)
  const shareHandled = useRef(false)
  const deckActiveIdRef = useRef(null)

  // Push a history entry when detail opens so the browser back button closes it
  useEffect(() => {
    if (!selectedRecipe) return
    window.history.pushState({ recipeDetail: true }, '')
    function onPopState() { setSelectedRecipe(null); setSharedRecipe(null) }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [!!selectedRecipe]) // eslint-disable-line react-hooks/exhaustive-deps

  const [printRecipeId, setPrintRecipeId] = useState(null)
  const [formState, setFormState] = useState({ open: false, recipe: null })

  const [importState, setImportState] = useState({ open: false, method: null, prefill: '' })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState('recipes')
  const [profileInitialPage, setProfileInitialPage] = useState(null)

  function handleTabChange(tab) {
    // If a recipe detail is open, close it before switching tabs
    if (selectedRecipe) window.history.back()
    setMobileTab(tab)
  }


  // Drag state
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  function toggleTag(tag) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const matchesFilters = useCallback((recipe) => {
    const matchesTag = activeTags.length === 0 || activeTags.every(t => recipe.tags.includes(t))
    if (!matchesTag) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      recipe.title.toLowerCase().includes(q) ||
      recipe.description.toLowerCase().includes(q) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(q))
    )
  }, [activeTags, searchQuery])

  const filteredRecipes = useMemo(
    () => sortRecipes(recipes.filter(matchesFilters), sortBy, cardOrder),
    [recipes, matchesFilters, sortBy, cardOrder]
  )

  function handlePrint(recipeId) {
    setPrintRecipeId(recipeId)
    setTimeout(() => {
      window.print()
      setPrintRecipeId(null)
    }, 50)
  }

  function handleFormSubmit(data) {
    if (formState.recipe?.id) {
      updateRecipe(formState.recipe.id, data)
      setSelectedRecipe(r => r ? { ...r, ...data } : r)
    } else {
      const id = 'user-' + Date.now()
      const newRecipe = { ...data, id }
      addRecipe(newRecipe)
      appendNew(id)
      maybeAutoNutrition(newRecipe)
    }
    setFormState({ open: false, recipe: null })
    setSettingsOpen(false)
  }

  function closeImport() {
    setImportState({ open: false, method: null, prefill: '' })
  }

  // Fire-and-forget: newly added recipes with no core nutrition stats get an
  // AI estimate in the background (Account setting, on by default). Failures
  // are silent — the recipe simply keeps its empty stats.
  function maybeAutoNutrition(recipe) {
    if (!settings.autoNutrition || !settings.aiApiKey) return
    if (!recipe.ingredients?.length) return
    const CORE = ['cal', 'protein', 'fiber', 'fat']
    const hasCoreStat = (recipe.stats || []).some(
      s => CORE.includes(normalizeStatLabel(s.label)) && String(s.value ?? '').trim()
    )
    if (hasCoreStat) return
    callAI(buildNutritionPrompt(recipe), settings)
      .then(text => {
        const merged = mergeStats(recipe.stats || [], parseNutritionResponse(extractJson(text)))
        updateRecipe(recipe.id, { stats: merged })
        setSelectedRecipe(r => (r && r.id === recipe.id ? { ...r, stats: merged } : r))
        showToast('Nutrition estimated with AI')
      })
      .catch(() => {})
  }

  function handleImport(data) {
    const id = 'user-' + Date.now()
    const newRecipe = { ...data, id }
    addRecipe(newRecipe)
    appendNew(id)
    closeImport()
    maybeAutoNutrition(newRecipe)
  }

  function handleConflictResolve(recipe, action) {
    if (action === 'keep') {
      // The cloud replace dropped this local-only recipe — restore it locally
      // as well as writing it back to the cloud.
      addRecipe(recipe)
      writeRecipe(db, user.uid, recipe).catch(console.error)
    } else {
      deleteRecipe(recipe.id)
      removeId(recipe.id)
    }
    setConflicts(prev => prev.filter(r => r.id !== recipe.id))
  }

  function showToast(msg) { setToastMsg(msg) }

  async function handleShare(recipe) {
    if (!user) {
      await shareRecipe(recipe, () => {})
      showToast('Sign in to make the share link work for others.')
      return
    }
    await shareRecipe(recipe, showToast)
    writePublicRecipe(db, recipe).catch(console.error)
  }

  function handleAddSharedRecipe(name) {
    if (!sharedRecipe) return
    const id = 'user-' + Date.now()
    const newRecipe = { ...sharedRecipe, id, title: name || sharedRecipe.title, isUserAdded: true }
    addRecipe(newRecipe)
    appendNew(id)
    setSharedRecipe(null)
    setSelectedRecipe(null)
    showToast('Added to your recipes!')
    maybeAutoNutrition(newRecipe)
  }

  // Deep link: open recipe from ?recipe=id query param
  useEffect(() => {
    if (authLoading) return
    if (recipes.length === 0) return
    if (deepLinkHandled.current) return
    deepLinkHandled.current = true

    const params = new URLSearchParams(window.location.search)
    const recipeId = params.get('recipe')
    if (!recipeId) return

    window.history.replaceState({}, '', window.location.pathname)

    const local = recipes.find(r => r.id === recipeId)
    if (local) { setSelectedRecipe(local); return }

    fetchPublicRecipe(db, recipeId).then(pub => {
      if (pub) { setSharedRecipe(pub); setSelectedRecipe(pub) }
    }).catch(console.error)
  }, [authLoading, recipes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Android share target: PWA opened via /?url=…&text=…&title=… from a share sheet
  useEffect(() => {
    if (authLoading || shareHandled.current) return
    shareHandled.current = true

    const params = new URLSearchParams(window.location.search)
    if (params.get('recipe')) return // recipe deep link owns this URL
    const sharedText = params.get('url') || params.get('text') || ''
    if (!sharedText) return

    window.history.replaceState({}, '', window.location.pathname)

    // Shares often embed the URL mid-sentence in `text` — strip trailing punctuation
    const urlMatch = sharedText.match(/https?:\/\/\S+/)
    const sharedUrl = params.get('url') || (urlMatch ? urlMatch[0].replace(/[.,;:)\]}>]+$/, '') : null)

    if (sharedUrl) {
      let method = 'website'
      if (/youtube\.com|youtu\.be/.test(sharedUrl)) method = 'youtube'
      else if (/instagram\.com|instagr\.am|tiktok\.com/.test(sharedUrl)) method = 'social'
      setImportState({ open: true, method, prefill: sharedUrl })
    } else {
      setImportState({ open: true, method: 'text', prefill: sharedText })
    }
  }, [authLoading])

  function handleDelete(id) {
    deleteRecipe(id)
    removeId(id)
    if (selectedRecipe?.id === id) window.history.back()  // popstate listener closes detail
    if (user) {
      // Tombstone first: even if the doc delete is lost, the merge drops it.
      writeDeletions(db, user.uid, 'recipes', [id])
        .then(() => deleteRecipeDoc(db, user.uid, id))
        .catch(console.error)
    }
  }

  function syncGroceryDeletions(ids) {
    if (!user || ids.length === 0) return
    writeDeletions(db, user.uid, 'grocery', ids)
      .then(() => Promise.all(ids.map(id => deleteGroceryItemDoc(db, user.uid, id))))
      .catch(console.error)
  }

  function handleRemoveGroceryItem(id) {
    removeItem(id)
    syncGroceryDeletions([id])
  }

  function handleClearChecked() {
    const idsToDelete = groceryItems.filter(i => i.checked).map(i => i.id)
    clearChecked()
    syncGroceryDeletions(idsToDelete)
  }

  function handleClearAll() {
    const idsToDelete = groceryItems.map(i => i.id)
    clearAll()
    syncGroceryDeletions(idsToDelete)
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
          onImportRecipe={() => setImportState({ open: true, method: null, prefill: '' })}

          onOpenSettings={() => setSettingsOpen(true)}
          onOpenTagSettings={() => { setProfileInitialPage('tags'); setMobileTab('profile') }}
          authUser={user}
          authLoading={authLoading}
          onSignIn={signIn}
          onSignOut={handleSignOut}
          cardMode={settings.cardMode}
          onCardModeChange={mode => setSetting('cardMode', mode)}
        />
      )}
      <div className={`recipes-container${mobileTab !== 'recipes' ? ' hide-mobile' : ''}`}>
        {recipes.length === 0 ? (
          <WelcomeState
            onCreateFirst={() => setImportState({ open: true, method: null, prefill: '' })}
            authUser={user}
            authLoading={authLoading}
            onSignIn={signIn}
          />
        ) : filteredRecipes.length === 0 ? (
          <div className="empty-state visible">No recipes match that filter.</div>
        ) : settings.cardMode === 'compact' ? (
          <>
            <MasonryGrid
              recipes={filteredRecipes}
              allTags={allTags}
              onCardClick={setSelectedRecipe}
            />
            <RecipeListEnd />
          </>
        ) : settings.cardMode === 'deck' ? (
          <DeckGrid
            recipes={filteredRecipes}
            allTags={allTags}
            onOpenRecipe={setSelectedRecipe}
            initialActiveId={deckActiveIdRef.current}
            onActiveChange={id => { deckActiveIdRef.current = id }}
            isVisible={mobileTab === 'recipes'}
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
                  onShare={e => { e.stopPropagation(); handleShare(recipe) }}
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
          onAddIngredients={(recipe) => {
            const added = addIngredients(recipe)
            if (added.length > 0) {
              setBulkAddUndo({ message: `Added ${added.length} ingredient${added.length !== 1 ? 's' : ''} to list`, ids: added.map(i => i.id) })
              const unclassified = added.filter(i => i.category === null)
              if (unclassified.length) {
                classifyBatchWithAI(unclassified.map(i => i.name), settings).then(map => {
                  unclassified.forEach(item => { if (map[item.name]) updateItemCategory(item.id, map[item.name]) })
                })
              }
            }
          }}
          groceryNames={new Set(groceryItems.map(i => i.name.toLowerCase()))}
          onAddItem={(name, amount, recipeTitle) => { addItem(name, amount, recipeTitle) }}
          onShare={() => handleShare(selectedRecipe)}
          isSharedView={sharedRecipe != null && sharedRecipe.id === selectedRecipe.id}
          existingTitles={recipes.map(r => r.title.trim().toLowerCase())}
          authUser={user}
          onSignIn={signIn}
          onAddToMyRecipes={handleAddSharedRecipe}
          settings={settings}
          onApplyAIUpdate={patch => {
            updateRecipe(selectedRecipe.id, patch)
            setSelectedRecipe(r => (r ? { ...r, ...patch } : r))
          }}
          onOpenAccount={() => {
            setSelectedRecipe(null)
            setProfileInitialPage('account')
            setMobileTab('profile')
          }}
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

{mobileTab === 'grocery' && (
        <GroceryList
          items={groceryItems}
          onToggle={toggleItem}
          onRemove={handleRemoveGroceryItem}
          onUpdate={updateItem}
          onClearChecked={handleClearChecked}
          onClearAll={handleClearAll}
          isFullPage={true}
          onAddItem={(name, amount) => {
            const created = addItem(name, amount, '')
            if (created?.category === null) {
              classifyBatchWithAI([created.name], settings).then(map => {
                if (map[created.name]) updateItemCategory(created.id, map[created.name])
              })
            }
          }}
        />
      )}

      {mobileTab === 'profile' && (
        <ProfilePage
          initialPage={profileInitialPage}
          onInitialPageConsumed={() => setProfileInitialPage(null)}
          auth={{ user, authLoading, onSignIn: signIn, onSignOut: handleSignOut, onDeleteAccount: handleDeleteAccount }}
          data={{ recipes, allTags, customTags, settings }}
          handlers={{
            onSettingChange: setSetting,
            onEditRecipe: recipe => setFormState({ open: true, recipe }),
            onDeleteRecipe: handleDelete,
            onOpenRecipe: setSelectedRecipe,
            onUpdateRecipe: updateRecipe,
            onEditTag: editTag,
            onDeleteTag: slug => {
              recipes.forEach(r => {
                if (r.tags.includes(slug)) updateRecipe(r.id, { ...r, tags: r.tags.filter(t => t !== slug) })
              })
              deleteTag(slug)
              if (user) deleteTagDoc(db, user.uid, slug).catch(console.error)
            },
            onAddTag: addTag,
          }}
          pwa={{ updateAvailable, onApplyUpdate: applyUpdate, onCheckUpdate: checkForUpdate }}
        />
      )}

      {formState.open && (
        <RecipeForm
          recipe={formState.recipe}
          allTags={allTags}
          onAddTag={addTag}
          onSubmit={handleFormSubmit}
          onClose={() => setFormState({ open: false, recipe: null })}
          recipes={recipes}
        />
      )}

      {importState.open && (
        <ImportModal
          allTags={allTags}
          onAddTag={addTag}
          onImport={handleImport}
          onEditFirst={draft => {
            closeImport()
            setFormState({ open: true, recipe: draft })
          }}
          onCreateManually={() => {
            closeImport()
            setFormState({ open: true, recipe: null })
          }}
          onOpenAccount={() => {
            closeImport()
            setProfileInitialPage('account')
            setMobileTab('profile')
          }}
          settings={settings}
          onClose={closeImport}
          initialMethod={importState.method}
          prefill={importState.prefill}
        />
      )}

      {conflicts.length > 0 && (
        <ConflictModal conflicts={conflicts} onResolve={handleConflictResolve} />
      )}

      <UpdateToast visible={updateAvailable} onApply={applyUpdate} />
      <ShareToast message={toastMsg} onDismiss={() => setToastMsg(null)} />
      <GroceryBulkToast
        info={bulkAddUndo}
        onUndo={(ids) => { removeItems(ids); syncGroceryDeletions(ids); setBulkAddUndo(null) }}
        onDismiss={() => setBulkAddUndo(null)}
      />

      <BottomNav
        activeTab={mobileTab}
        onTabChange={handleTabChange}
        groceryCount={uncheckedGroceryCount}
      />
    </>
  )
}
