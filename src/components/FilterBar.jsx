import { useState, useEffect, useRef } from 'react'
import AuthButton from './AuthButton.jsx'

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ── Sort options ──────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function FilterBar({
  allTags, activeTag, onTagChange,
  searchQuery, onSearchChange,
  sortBy, onSortChange,
  onAddRecipe, onImportRecipe,
  groceryCount, onOpenGrocery,
  onOpenSettings,
  authUser, authLoading, onSignIn, onSignOut,
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileTagsOpen,   setMobileTagsOpen]   = useState(false)
  const [mobileSortOpen,   setMobileSortOpen]   = useState(false)
  const filterBarRef  = useRef(null)
  const lastScrollY   = useRef(0)
  const searchInputRef = useRef(null)

  // Scroll-direction hide/show — passive listener, mutates DOM class directly
  useEffect(() => {
    function onScroll() {
      const el = filterBarRef.current
      if (!el) return
      const curr = window.scrollY
      if (curr > lastScrollY.current + 8)      el.classList.add('filter-bar--hidden')
      else if (curr < lastScrollY.current - 8) el.classList.remove('filter-bar--hidden')
      lastScrollY.current = curr
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Escape closes any open mobile panel
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return
      setMobileSearchOpen(false)
      setMobileTagsOpen(false)
      setMobileSortOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Focus the search input only when the user explicitly opens it
  useEffect(() => {
    if (mobileSearchOpen) searchInputRef.current?.focus()
  }, [mobileSearchOpen])

  function handleTagChange(tag) { onTagChange(tag); setMobileTagsOpen(false) }
  function handleSortChange(val) { onSortChange(val); setMobileSortOpen(false) }

  const activeTagObj = activeTag !== 'all' ? allTags.find(t => t.tag === activeTag) : null

  return (
    <div ref={filterBarRef} className="filter-bar">

      {/* ── Mobile layout (≤768px via CSS) ── */}
      <div className="filter-bar-mobile">

        {/* Icon row — collapses when search opens */}
        <div className={`mobile-icon-row${mobileSearchOpen ? ' search-open' : ''}`}>
          <button className="mobile-icon-btn" onClick={() => setMobileSearchOpen(true)} aria-label="Search">
            <SearchIcon />
          </button>
          <button
            className={`mobile-icon-btn${mobileSortOpen ? ' active' : ''}`}
            onClick={() => { setMobileSortOpen(v => !v); setMobileTagsOpen(false) }}
            aria-label="Sort"
          >
            <SortIcon />
          </button>
          <button
            className={`mobile-icon-btn${mobileTagsOpen || activeTag !== 'all' ? ' active' : ''}`}
            onClick={() => { setMobileTagsOpen(v => !v); setMobileSortOpen(false) }}
            aria-label="Filter by tag"
          >
            <TagIcon />
          </button>
          <button className="mobile-icon-btn" onClick={onAddRecipe} aria-label="Add recipe">
            <PlusIcon />
          </button>
        </div>

        {/* Search row — expands when search opens */}
        <div className={`mobile-search-row${mobileSearchOpen ? ' search-open' : ''}`}>
          <button
            className="mobile-icon-btn"
            onClick={() => { setMobileSearchOpen(false); onSearchChange('') }}
            aria-label="Close search"
          >
            <BackIcon />
          </button>
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search recipes, ingredients..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setMobileSearchOpen(false)}
          />
          {searchQuery && (
            <button className="mobile-icon-btn" onClick={() => onSearchChange('')} aria-label="Clear search">
              <CloseIcon />
            </button>
          )}
        </div>

        {/* Sort picker panel — overlays content */}
        {mobileSortOpen && (
          <div className="mobile-sort-panel">
            <select className="sort-select" value={sortBy} onChange={e => handleSortChange(e.target.value)}>
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tag picker panel — overlays content */}
        {mobileTagsOpen && (
          <div className="mobile-tags-panel">
            <div className="filter-tags">
              <span
                className={`ftag${activeTag === 'all' ? ' active' : ''}`}
                data-tag="all"
                onClick={() => handleTagChange('all')}
              >
                <span className="dot" /> All recipes
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
                    onClick={() => handleTagChange(tag)}
                  >
                    <span className="dot" /> {label}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Active tag chip — shown when tag active and picker is closed */}
        {activeTagObj && !mobileTagsOpen && (
          <div className="active-tag-chips">
            <span
              className="active-tag-chip"
              style={{ background: activeTagObj.color.bg, color: activeTagObj.color.text }}
            >
              {activeTagObj.label}
              <button className="active-tag-chip-clear" onClick={() => onTagChange('all')}>×</button>
            </span>
          </div>
        )}
      </div>

      {/* ── Desktop / tablet layout (≥769px via CSS) ── */}
      <div className="filter-bar-desktop">
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

    </div>
  )
}
