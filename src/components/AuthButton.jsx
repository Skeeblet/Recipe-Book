export default function AuthButton({ user, authLoading, onSignIn, onSignOut }) {
  if (authLoading) return null
  if (!user) {
    return (
      <button className="auth-btn" onClick={onSignIn}>
        Sign in with Google
      </button>
    )
  }
  return (
    <div className="auth-user">
      <img className="auth-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
      <button className="auth-btn auth-btn--out" onClick={onSignOut}>Sign out</button>
    </div>
  )
}
