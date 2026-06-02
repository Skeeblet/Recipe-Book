export default function ProfilePage({ user, authLoading, onSignIn, onSignOut, cardMode, onCardModeChange }) {
  return (
    <div className="profile-page">
      <div className="profile-avatar-wrap">
        {user?.photoURL
          ? <img className="profile-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          : <div className="profile-avatar profile-avatar--placeholder" />
        }
      </div>
      {user ? (
        <>
          <p className="profile-name">{user.displayName}</p>
          <p className="profile-email">{user.email}</p>
          <button className="btn-secondary profile-auth-btn" onClick={onSignOut}>Sign out</button>
        </>
      ) : (
        <>
          <p className="profile-name">Not signed in</p>
          <p className="profile-hint">Sign in to sync recipes across devices.</p>
          <button className="btn-primary profile-auth-btn" onClick={onSignIn} disabled={authLoading}>
            Sign in with Google
          </button>
        </>
      )}

      <div className="profile-section">
        <p className="profile-section-label">Display</p>
        <div className="card-mode-buttons">
          {['basic', 'compact', 'deck'].map(mode => (
            <button
              key={mode}
              className={`card-mode-btn${cardMode === mode ? ' active' : ''}`}
              onClick={() => onCardModeChange(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
