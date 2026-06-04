import { useEffect } from 'react'

export default function ShareToast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, 2000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null
  return <div className="share-toast">{message}</div>
}
