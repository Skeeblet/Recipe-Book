import { RecipesIcon, GroceryIcon, ProfileIcon } from './NavIcons.jsx'

const TABS = [
  { id: 'recipes', label: 'Recipes',  Icon: RecipesIcon },
  { id: 'grocery', label: 'Grocery',  Icon: GroceryIcon },
  { id: 'profile', label: 'Profile',  Icon: ProfileIcon },
]

// Phone-only (hidden ≥769px); the desktop header opens Grocery/Profile as drawers.
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
              <span className="nav-badge">{groceryCount}</span>
            )}
          </span>
          <span className="bottom-nav-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
