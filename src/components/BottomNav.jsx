function RecipesIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="12" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="12" width="7" height="7" rx="1" />
      <rect x="12" y="12" width="7" height="7" rx="1" />
    </svg>
  )
}

function GroceryIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h2l2.5 9h9l2-6H7" />
      <circle cx="9.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="7" r="4" />
      <path d="M3 19c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

const TABS = [
  { id: 'recipes', label: 'Recipes',  Icon: RecipesIcon },
  { id: 'grocery', label: 'Grocery',  Icon: GroceryIcon },
  { id: 'profile', label: 'Profile',  Icon: ProfileIcon },
]

export default function BottomNav({ activeTab, onTabChange, groceryCount }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`bottom-nav-tab${activeTab === id ? ' active' : ''}`}
          onClick={() => onTabChange(id)}
        >
          <span className="bottom-nav-icon">
            <Icon />
            {id === 'grocery' && groceryCount > 0 && (
              <span className="bottom-nav-badge">{groceryCount}</span>
            )}
          </span>
          <span className="bottom-nav-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
