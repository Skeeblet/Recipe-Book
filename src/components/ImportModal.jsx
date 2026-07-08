import { useEffect, useRef, useState } from 'react'
import { callAI, extractJson, MissingApiKeyError } from '../utils/aiClient.js'
import { extractRecipeFromHtml, htmlToText } from '../utils/schemaOrgRecipe.js'
import { extractVideoId, fetchYouTubeData } from '../utils/youtubeTranscript.js'
import {
  normalizeImportedRecipe,
  resolveTags,
  fetchViaProxy,
  fetchWebsiteHtml,
  isSocialUrl,
  buildWebsitePrompt,
  buildTextPrompt,
  buildGeneratePrompt,
  buildPhotoPrompt,
  buildYouTubePrompt,
  buildSocialPrompt,
  JSON_TEMPLATE,
} from '../utils/importRecipe.js'

// ── Tile icons ────────────────────────────────────────────────────────────────

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

// ── Method config ─────────────────────────────────────────────────────────────

// One "link" tile handles website / YouTube / Instagram / TikTok — the URL is
// parsed at import time and routed to the right extractor. No requiresKey gate:
// website works keyless via Schema.org, and the AI-only routes surface the key
// prompt on submit (MissingApiKeyError) instead of graying out the tile.
const METHODS = [
  { key: 'link', label: 'From a link', icon: LinkIcon, enabled: true },
  { key: 'photo', label: 'Photo', icon: CameraIcon, enabled: true, requiresKey: true },
  { key: 'text', label: 'Text', icon: DocumentIcon, enabled: true, requiresKey: true },
  { key: 'json', label: 'JSON', icon: CodeIcon, enabled: true },
  { key: 'ai', label: 'Create with AI', icon: SparkleIcon, enabled: true, requiresKey: true },
  { key: 'manual', label: 'Create manually', icon: PencilIcon, enabled: true },
]

const METHOD_TITLES = {
  link: 'Import from a link',
  photo: 'Import from photo',
  text: 'Import from text',
  json: 'Import from JSON',
  ai: 'Create with AI',
}

// Route a pasted URL to the matching extractor.
function detectLinkType(url) {
  if (extractVideoId(url)) return 'youtube'
  if (isSocialUrl(url)) return 'social'
  return 'website'
}

// Downscale to <=1200px on the longest side and re-encode as JPEG so the
// image/jpeg media type sent to the AI is always correct (also converts
// PNG/WebP sources).
async function fileToResizedBase64(file) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Couldn't read that image — try a JPG or PNG."))
      el.src = objectUrl
    })
    const longest = Math.max(img.naturalWidth, img.naturalHeight)
    const scale = longest > 1200 ? 1200 / longest : 1
    const width = Math.round(img.naturalWidth * scale)
    const height = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(img, 0, 0, width, height)
    if (scale < 1) console.log(`Photo import: resized ${img.naturalWidth}×${img.naturalHeight} → ${width}×${height}`)
    return canvas.toDataURL('image/jpeg', 0.85).replace(/^data:image\/jpeg;base64,/, '')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const API_KEY_MSG =
  'Add your Gemini API key in Profile → AI to use this feature. ' +
  'Gemini has a free tier — get a key at aistudio.google.com.'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ImportModal({
  allTags,
  onAddTag,
  onEditFirst,
  onCreateManually,
  onOpenAISettings,
  settings,
  onClose,
  initialMethod = null,
  prefill = '',
}) {
  const [step, setStep] = useState(initialMethod ? 'input' : 'picker') // picker | input | loading
  const [method, setMethod] = useState(initialMethod)
  const [input, setInput] = useState(prefill)
  const [error, setError] = useState('')
  const [needsKey, setNeedsKey] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const requestId = useRef(0)
  const abortRef = useRef(null)
  const userInteractedRef = useRef(false)
  const initialMethodRef = useRef(initialMethod)
  const prefillRef = useRef(prefill)

  const hasApiKey = !!settings?.aiApiKey
  const existingTagSlugs = allTags.map(t => t.tag)

  // Revoke the preview object URL whenever it's replaced or on unmount
  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }
  }, [photoPreview])

  // Share-target flow: auto-start the import shortly after opening with a
  // prefilled URL, unless the user interacts first or a required key is missing.
  useEffect(() => {
    if (!initialMethodRef.current || !prefillRef.current?.trim()) return
    if (METHODS.find(m => m.key === initialMethodRef.current)?.requiresKey && !hasApiKey) return
    const t = setTimeout(() => {
      if (!userInteractedRef.current) runImport()
    }, 500)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function cancelInFlight() {
    if (abortRef.current) abortRef.current.abort()
    requestId.current++
  }

  function handleClose() {
    userInteractedRef.current = true
    cancelInFlight()
    onClose()
  }

  // Any interaction suppresses the share-target auto-run
  function updateInput(value) {
    userInteractedRef.current = true
    setInput(value)
    setError('')
  }

  function selectMethod(m) {
    userInteractedRef.current = true
    if (!m.enabled) return
    if (m.requiresKey && !hasApiKey) {
      onOpenAISettings()
      return
    }
    if (m.key === 'manual') {
      onCreateManually()
      return
    }
    setMethod(m.key)
    setInput('')
    setError('')
    setNeedsKey(false)
    setPhotoFile(null)
    setPhotoPreview(null)
    setStep('input')
  }

  function goBack() {
    userInteractedRef.current = true
    cancelInFlight()
    if (step === 'loading') {
      setStep('input')
    } else {
      setError('')
      setNeedsKey(false)
      setStep('picker')
    }
  }

  // ── Import flows ────────────────────────────────────────────────────────────

  async function importWebsite(url, signal) {
    const html = await fetchWebsiteHtml(url, signal)
    const schema = extractRecipeFromHtml(html)
    if (schema && schema.title && schema.ingredients.length >= 2) {
      return normalizeImportedRecipe(schema)
    }
    setLoadingMsg('Asking AI to read the page…')
    const pageText = htmlToText(html, 12000)
    const json = extractJson(await callAI(buildWebsitePrompt(pageText, existingTagSlugs), settings, null, signal))
    return normalizeImportedRecipe(json)
  }

  async function importText(text, signal) {
    const json = extractJson(await callAI(buildTextPrompt(text, existingTagSlugs), settings, null, signal))
    return normalizeImportedRecipe(json)
  }

  async function importGenerate(description, signal) {
    const json = extractJson(await callAI(buildGeneratePrompt(description, existingTagSlugs), settings, null, signal))
    return normalizeImportedRecipe(json)
  }

  async function importPhoto(signal) {
    const base64 = await fileToResizedBase64(photoFile)
    const json = extractJson(await callAI(buildPhotoPrompt(existingTagSlugs), settings, base64, signal))
    if (json.error) {
      throw new Error("Couldn't read a recipe from that photo. Try a clearer image or use text import instead.")
    }
    return normalizeImportedRecipe(json)
  }

  async function importYouTube(url, signal) {
    const videoId = extractVideoId(url)
    if (!videoId) throw new Error("That doesn't look like a YouTube URL.")
    const { title, description, transcript } = await fetchYouTubeData(videoId, signal)
    if (!transcript && (description || '').length < 200) {
      throw new Error(
        "This video doesn't have captions. Try a video with subtitles enabled, or copy the recipe from the description and use Text import."
      )
    }
    setLoadingMsg('Asking AI to extract the recipe…')
    const prompt = buildYouTubePrompt(title, description, transcript.slice(0, 8000), existingTagSlugs)
    const json = extractJson(await callAI(prompt, settings, null, signal))
    return normalizeImportedRecipe(json)
  }

  async function importSocial(url, signal) {
    // Best-effort: Instagram/TikTok block scraping, so a failed or empty
    // fetch is expected — the AI works from the URL alone if needed.
    let content = ''
    try {
      content = htmlToText(await fetchViaProxy(url, signal), 8000)
    } catch (e) {
      if (e.name === 'AbortError') throw e
    }
    const json = extractJson(await callAI(buildSocialPrompt(url, content, existingTagSlugs), settings, null, signal))
    if (json.error) {
      const message = json.message || 'Could not extract recipe.'
      throw new Error(`${message} Tip: Copy the caption or description from the post and use Text import — it works every time.`)
    }
    return normalizeImportedRecipe(json)
  }

  async function importLink(url, signal) {
    const type = detectLinkType(url)
    if (type === 'youtube') return importYouTube(url, signal)
    if (type === 'social') return importSocial(url, signal)
    return importWebsite(url, signal)
  }

  function importJson(text) {
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message)
    }
    const normalized = normalizeImportedRecipe(parsed)
    if (normalized.ingredients.length === 0) {
      throw new Error('The recipe needs at least one ingredient in the "ingredients" array.')
    }
    return normalized
  }

  async function runImport() {
    setError('')
    setNeedsKey(false)
    if (method === 'photo') {
      if (!photoFile) {
        setError('Choose a photo first.')
        return
      }
    } else if (!input.trim()) {
      setError(method === 'link' ? 'Paste a link first.' : 'Nothing to import yet — add some content first.')
      return
    }
    if (method === 'link' && !/^(https?:\/\/|www\.)|\.[a-z]{2,}/i.test(input.trim())) {
      setError("That doesn't look like a link. Paste a website, YouTube, Instagram, or TikTok URL.")
      return
    }

    if (method === 'json') {
      try {
        onEditFirst(finalizeDraft(importJson(input)))
      } catch (e) {
        setError(e.message)
      }
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const id = ++requestId.current
    const linkType = method === 'link' ? detectLinkType(input) : null
    setLoadingMsg(
      method === 'ai' ? 'Generating recipe…'
      : method === 'photo' ? 'Reading recipe from photo…'
      : linkType === 'youtube' ? 'Fetching video transcript…'
      : linkType === 'social' ? 'Looking for the recipe…'
      : 'Reading recipe…'
    )
    setStep('loading')

    try {
      let result
      if (method === 'link') result = await importLink(input, controller.signal)
      else if (method === 'photo') result = await importPhoto(controller.signal)
      else if (method === 'text') result = await importText(input, controller.signal)
      else result = await importGenerate(input, controller.signal)
      if (id !== requestId.current) return
      // Skip the summary review and open the full editable form so everything
      // (ingredients, steps, stats, tags) can be checked before saving.
      onEditFirst(finalizeDraft(result))
      return
    } catch (e) {
      if (e.name === 'AbortError' || id !== requestId.current) return
      if (e instanceof MissingApiKeyError) {
        setNeedsKey(true)
      } else {
        setError(e.message)
      }
      setStep('input')
    }
  }

  // Resolve tags before handing the parsed recipe to the editable form.
  // AI-suggested and scraped tags may only match existing tags, never create
  // new ones. JSON import is user-authored data, so unknown tags are created.
  function finalizeDraft(d) {
    const addFn = method === 'json' ? onAddTag : null
    return { ...d, tags: resolveTags(d.tags, allTags, addFn) }
  }

  function handlePhotoSelected(e) {
    userInteractedRef.current = true
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError('')
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 1024 * 1024) {
      setError('That file is too large — .json files should be under 1 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setInput(String(reader.result))
      setError('')
    }
    reader.onerror = () => setError("Couldn't read that file. Try pasting the JSON instead.")
    reader.readAsText(file)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const headerTitle =
    step === 'picker' ? 'Add a recipe'
    : METHOD_TITLES[method] || 'Import recipe'

  // 'link' is intentionally excluded — a website URL works without a key, so
  // the key prompt surfaces only if a route actually needs AI (via needsKey).
  const methodNeedsAI = method === 'text' || method === 'ai' || method === 'photo'

  return (
    <div
      className="modal-overlay modal-overlay--sheet"
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <div className="modal import-modal modal--sheet">
        <div className="modal-header">
          <div className="import-header-left">
            {step !== 'picker' && (
              <button className="import-back-btn" onClick={goBack} aria-label="Back">
                <BackIcon />
              </button>
            )}
            <h2>{headerTitle}</h2>
          </div>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        {step === 'picker' && (
          <div className="modal-body">
            <div className="import-picker-grid">
              {METHODS.map(m => {
                const needsKey = m.enabled && m.requiresKey && !hasApiKey
                return (
                  <button
                    key={m.key}
                    className={`import-tile${m.enabled ? '' : ' import-tile--disabled'}${needsKey ? ' import-tile--needs-key' : ''}`}
                    onClick={() => selectMethod(m)}
                    disabled={!m.enabled}
                    title={needsKey ? 'Requires an AI API key — tap to add one' : undefined}
                  >
                    <span className="import-tile-icon"><m.icon /></span>
                    <span className="import-tile-label">{m.label}</span>
                    {!m.enabled && <span className="import-tile-badge">Soon</span>}
                    {needsKey && <span className="import-tile-badge">AI required</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 'input' && (
          <>
            <div className="modal-body">
              {method === 'link' && (
                <>
                  <p className="import-hint">
                    Paste a link from a recipe website, YouTube, Instagram, or TikTok.
                    Needs an internet connection and may not work on every site.
                  </p>
                  <input
                    type="text"
                    className="import-url-input"
                    value={input}
                    onChange={e => updateInput(e.target.value)}
                    placeholder="https://example.com/… , a YouTube, Instagram, or TikTok link"
                    inputMode="url"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && runImport()}
                  />
                </>
              )}

              {method === 'photo' && (
                <>
                  <p className="import-hint">
                    Snap or choose a photo of a recipe — a cookbook page, a printed card, or a
                    screenshot.
                  </p>
                  {photoPreview && (
                    <img className="import-photo-preview" src={photoPreview} alt="Selected recipe" />
                  )}
                  <div className="import-photo-row">
                    {/* No capture attribute: gallery/file picker. The capture
                        variant below forces the camera — having it on this
                        input would block gallery access on Android. */}
                    <input
                      type="file"
                      id="import-photo-file"
                      className="import-file-input"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handlePhotoSelected}
                    />
                    <label htmlFor="import-photo-file" className="btn-secondary import-file-label">
                      {photoFile ? 'Choose a different photo' : 'Choose photo'}
                    </label>
                    <input
                      type="file"
                      id="import-photo-camera"
                      className="import-file-input"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      capture="environment"
                      onChange={handlePhotoSelected}
                    />
                    <label htmlFor="import-photo-camera" className="btn-secondary import-file-label import-camera-label">
                      Take photo
                    </label>
                  </div>
                </>
              )}

              {method === 'text' && (
                <>
                  <p className="import-hint">
                    Paste any text with a recipe in it — from a notes app, a blog post, or a
                    message from a friend.
                  </p>
                  <textarea
                    className="import-textarea import-textarea--short"
                    value={input}
                    onChange={e => updateInput(e.target.value)}
                    placeholder="Paste your recipe text here…"
                    autoFocus
                  />
                </>
              )}

              {method === 'ai' && (
                <>
                  <p className="import-hint">
                    Describe the recipe you want and AI will create it for you.
                  </p>
                  <textarea
                    className="import-textarea import-textarea--short"
                    value={input}
                    onChange={e => updateInput(e.target.value)}
                    placeholder='e.g. "a high protein chicken bowl under 600 calories"'
                    autoFocus
                  />
                </>
              )}

              {method === 'json' && (
                <>
                  <p className="import-hint">
                    Paste recipe JSON below or upload a .json file. Copy the template to see
                    the expected format.
                  </p>
                  <textarea
                    className="import-textarea"
                    value={input}
                    onChange={e => updateInput(e.target.value)}
                    placeholder={'{\n  "title": "…",\n  "ingredients": […]\n}'}
                    spellCheck={false}
                  />
                  <div className="import-file-row">
                    <input
                      type="file"
                      id="import-json-file"
                      className="import-file-input"
                      accept=".json,application/json"
                      onChange={handleFile}
                    />
                    <label htmlFor="import-json-file" className="btn-secondary import-file-label">
                      Upload .json file
                    </label>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => navigator.clipboard.writeText(JSON_TEMPLATE).catch(() => {})}
                    >
                      Copy template
                    </button>
                  </div>
                </>
              )}

              {(needsKey || (methodNeedsAI && !hasApiKey)) && (
                <div className="import-key-note">
                  {API_KEY_MSG}
                  <button
                    type="button"
                    className="btn-secondary btn-sm import-key-note-btn"
                    onClick={onOpenAISettings}
                  >
                    Open AI settings
                  </button>
                </div>
              )}
              {error && <div className="import-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                onClick={runImport}
                disabled={method === 'photo' && !photoFile}
              >
                {method === 'ai' ? 'Generate' : 'Import'}
              </button>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="modal-body">
            <div className="import-loading">
              <div className="import-spinner" />
              <div className="import-loading-msg">{loadingMsg}</div>
              <button type="button" className="btn-secondary" onClick={goBack}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
