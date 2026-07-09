import { useLayoutEffect, useRef } from 'react'

// A textarea that grows to fit its content instead of scrolling — used for
// recipe steps, description, notes, and free-form AI prompts.
export default function AutoExpandTextarea({ value, onChange, ...props }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return <textarea ref={ref} value={value} onChange={onChange} {...props} />
}
