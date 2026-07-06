// First-run empty state: shown when the recipe list is completely empty.
export default function WelcomeState({ onCreateFirst, authUser, authLoading, onSignIn }) {
  return (
    <div className="welcome-state">
      <div className="welcome-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
        </svg>
      </div>
      <h2 className="welcome-title">Welcome to your Recipe Box</h2>
      <p className="welcome-sub">
        Keep every recipe you love in one place — import them from websites, photos,
        and videos, create them with AI, or write your own.
      </p>
      <button className="btn-primary welcome-cta" onClick={onCreateFirst}>
        + Create your first recipe
      </button>

      {!authUser && (
        <div className="welcome-signin">
          <p className="welcome-signin-text">
            Sign in with Google so your recipes are saved and synced across all your devices.
          </p>
          <button className="auth-btn" onClick={onSignIn} disabled={authLoading}>
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  )
}
