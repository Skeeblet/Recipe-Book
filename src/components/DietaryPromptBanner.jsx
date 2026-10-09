import { useEffect, useState } from 'react'

// One-time dropdown for existing users: nudges them to set up dietary
// restrictions. Delayed on mount so a cloud settings pull that already marks
// the prompt as seen can unmount it before it ever shows.
export default function DietaryPromptBanner({ onSetup, onDismiss, delay = 1500 }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  if (!show) return null
  return (
    <div className="dietary-banner" role="status">
      <div className="dietary-banner-text">
        <strong>New: dietary restrictions.</strong> Set them once and AI will flag conflicting
        ingredients whenever you add a recipe.
      </div>
      <div className="dietary-banner-actions">
        <button type="button" className="btn-primary btn-sm" onClick={onSetup}>Set up</button>
        <button type="button" className="dietary-banner-close" onClick={onDismiss} aria-label="Dismiss">✕</button>
      </div>
    </div>
  )
}
