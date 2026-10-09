import { useEffect } from 'react'

// Desktop side drawer for the Grocery and Profile sections. On phones the
// wrapper is `display: contents` (see CSS), so the child keeps rendering as a
// full-screen page under the bottom nav exactly as before — one component
// tree, two layouts.
export default function Drawer({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="drawer-root">
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={title}>
        <div className="drawer-topbar">
          <span className="drawer-title">{title}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  )
}
