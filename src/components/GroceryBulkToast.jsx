import { useEffect } from 'react'

export default function GroceryBulkToast({ info, onUndo, onDismiss }) {
  useEffect(() => {
    if (!info) return
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [info, onDismiss])

  if (!info) return null

  return (
    <div className="grocery-bulk-toast" onClick={() => { onUndo(info.ids); onDismiss() }}>
      {info.message} — <span className="grocery-bulk-toast-undo">tap to undo</span>
    </div>
  )
}
