import { useState, useEffect, useRef } from 'react'
import AuthButton from './AuthButton.jsx'

// ── View mode icons ───────────────────────────────────────────────────────────

function BasicViewIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="18" height="18" rx="3" />
    </svg>
  )
}

function CompactViewIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="8" height="8" rx="1.5" />
      <rect x="12" y="2" width="8" height="8" rx="1.5" />
      <rect x="2" y="12" width="8" height="8" rx="1.5" />
      <rect x="12" y="12" width="8" height="8" rx="1.5" />
    </svg>
  )
}

function DeckViewIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="12" width="18" height="7" rx="2" fill="var(--warm-white)" />
      <rect x="2" y="7" width="18" height="7" rx="2" fill="var(--warm-white)" />
      <rect x="2" y="2" width="18" height="7" rx="2" fill="var(--warm-white)" />
    </svg>
  )
}

const VIEW_MODES = ['basic', 'compact', 'deck']

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
  { value: 'time-asc',    label: 'Time: quick first' },
  { value: 'custom',       label: 'Custom order' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function FilterBar({
  allTags, activeTags, onTagChange,
  searchQuery, onSearchChange,
  sortBy, onSortChange,
  onAddRecipe, onImportRecipe,

  onOpenSettings, onOpenTagSettings,
  authUser, authLoading, onSignIn, onSignOut,
  cardMode, onCardModeChange,
}) {
  function cycleView() {
    const next = VIEW_MODES[(VIEW_MODES.indexOf(cardMode) + 1) % VIEW_MODES.length]
    onCardModeChange(next)
  }

  function ViewIcon() {
    if (cardMode === 'compact') return <CompactViewIcon />
    if (cardMode === 'deck')    return <DeckViewIcon />
    return <BasicViewIcon />
  }
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
      // Close any open panels when the user scrolls the recipe list
      setMobileTagsOpen(false)
      setMobileSortOpen(false)
      setMobileSearchOpen(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Escape or tap outside closes any open mobile panel
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return
      setMobileSearchOpen(false)
      setMobileTagsOpen(false)
      setMobileSortOpen(false)
    }
    function onOutside(e) {
      if (!filterBarRef.current?.contains(e.target)) {
        setMobileSearchOpen(false)
        setMobileTagsOpen(false)
        setMobileSortOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onOutside)
    }
  }, [])

  // Focus the search input only when the user explicitly opens it
  useEffect(() => {
    if (mobileSearchOpen) searchInputRef.current?.focus()
  }, [mobileSearchOpen])

  function handleTagChange(tag) { onTagChange(tag) } // keep panel open for multi-select
  function handleSortChange(val) { onSortChange(val); setMobileSortOpen(false) }

  return (
    <div ref={filterBarRef} className="filter-bar">

      {/* ── Mobile layout (≤768px via CSS) ── */}
      <div className="filter-bar-mobile">

        {/* Icon row — always visible */}
        <div className="mobile-icon-row">
          <button
            className={`mobile-icon-btn${(mobileSearchOpen || searchQuery) ? ' active' : ''}`}
            onClick={() => { setMobileSearchOpen(v => !v); setMobileTagsOpen(false); setMobileSortOpen(false) }}
            aria-label="Search"
          >
            <SearchIcon />
          </button>
          <button
            className={`mobile-icon-btn${mobileSortOpen ? ' active' : ''}`}
            onClick={() => { setMobileSortOpen(v => !v); setMobileTagsOpen(false); setMobileSearchOpen(false) }}
            aria-label="Sort"
          >
            <SortIcon />
          </button>
          <button
            className={`mobile-icon-btn${mobileTagsOpen || activeTags.length > 0 ? ' active' : ''}`}
            onClick={() => { setMobileTagsOpen(v => !v); setMobileSortOpen(false); setMobileSearchOpen(false) }}
            aria-label="Filter by tag"
          >
            <TagIcon />
          </button>
          <button className="mobile-icon-btn" onClick={cycleView} aria-label="Switch view">
            <ViewIcon />
          </button>
          <button className="mobile-icon-btn" onClick={onImportRecipe} aria-label="Add or import recipe">
            <PlusIcon />
          </button>
        </div>

        {/* Search panel — overlays content below the bar */}
        {mobileSearchOpen && (
          <div className="mobile-search-panel">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search recipes, ingredients..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              onKeyDown={e => (e.key === 'Escape' || e.key === 'Enter') && setMobileSearchOpen(false)}
            />
            {searchQuery && (
              <button className="mobile-icon-btn" onClick={() => onSearchChange('')} aria-label="Clear search">
                <CloseIcon />
              </button>
            )}
          </div>
        )}

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

        {/* Tag picker panel — overlays content; stays open for multi-select */}
        {mobileTagsOpen && (
          <div className="mobile-tags-panel">
            {allTags.length === 0 ? (
              <div className="filter-tags-empty">
                No tags yet.{' '}
                <button className="filter-tags-empty-btn" onClick={() => { setMobileTagsOpen(false); onOpenTagSettings?.() }}>
                  Create one
                </button>
              </div>
            ) : (
              <div className="filter-tags">
                {allTags.map(({ tag, label, color }) => {
                  const isActive = activeTags.includes(tag)
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
            )}
          </div>
        )}

        {/* Active filter chips — tags + search keyword, hidden while the relevant panel is open */}
        {(activeTags.length > 0 || (searchQuery && !mobileSearchOpen)) && !mobileTagsOpen && (
          <div className="active-tag-chips">
            {activeTags.map(tag => {
              const def = allTags.find(t => t.tag === tag)
              if (!def) return null
              return (
                <span key={tag} className="active-tag-chip"
                  style={{ background: def.color.bg, color: def.color.text }}>
                  {def.label}
                  <button className="active-tag-chip-clear" onClick={() => onTagChange(tag)}>×</button>
                </span>
              )
            })}
            {searchQuery && !mobileSearchOpen && (
              <span className="active-tag-chip active-tag-chip--search">
                "{searchQuery}"
                <button className="active-tag-chip-clear" onClick={() => onSearchChange('')}>×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop / tablet layout (≥769px via CSS) ── */}
      <div className="filter-bar-desktop">
        <div className="filter-bar-top">
          <div>
            <div className="filter-label">Filter by tag</div>
            {allTags.length === 0 ? (
                <div className="filter-tags-empty">
                  No tags yet.{' '}
                  <button className="filter-tags-empty-btn" onClick={onOpenTagSettings}>Create one</button>
                </div>
              ) : (
              <div className="filter-tags">
              {allTags.map(({ tag, label, color }) => {
                const isActive = activeTags.includes(tag)
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
            )}
          </div>
          <div className="filter-bar-actions">
            <AuthButton user={authUser} authLoading={authLoading} onSignIn={onSignIn} onSignOut={onSignOut} />

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
