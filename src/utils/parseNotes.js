export function parseNotesToArray(raw) {
  if (Array.isArray(raw)) return raw.length > 0 ? raw : [{ title: '', body: '' }]
  if (!raw || !raw.trim()) return [{ title: '', body: '' }]
  return raw.split(' | ').map(part => {
    const colonIdx = part.indexOf(':')
    if (colonIdx > 0 && colonIdx < 30)
      return { title: part.slice(0, colonIdx).trim(), body: part.slice(colonIdx + 1).trim() }
    return { title: '', body: part.trim() }
  })
}
