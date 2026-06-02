import { useEffect, useState } from 'react'

export default function UpdateToast({ visible, onApply }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!visible) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 8000)
    return () => clearTimeout(t)
  }, [visible])

  if (!show) return null
  return (
    <div className="update-toast" onClick={onApply}>
      App updated — tap to reload
    </div>
  )
}
