import { fetchViaProxy } from './importRecipe.js'

const NO_ACCESS_MSG = "Couldn't access that video. Make sure it's public."
const EXTRACT_FAIL_MSG =
  "Couldn't extract data from that video. Try copying the recipe description and using Text import instead."

// Accepts watch, youtu.be, shorts, embed, and m.youtube URLs -> 11-char id or null.
export function extractVideoId(url) {
  const str = String(url || '').trim()
  if (!str) return null
  const patterns = [
    /(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
  ]
  for (const re of patterns) {
    const m = str.match(re)
    if (m) return m[1]
  }
  return null
}

// YouTube embeds JSON strings that themselves contain { and }, so brace
// counting is unreliable — the statement-ending `};` is the sentinel instead.
// Later script code can also contain `};` (and so can JSON string values), so
// try each occurrence in order until one parses; the true end is the first
// occurrence that yields valid JSON.
export function extractPlayerResponse(html) {
  const marker = 'ytInitialPlayerResponse = '
  const start = html.indexOf(marker)
  if (start === -1) throw new Error('Could not parse YouTube page.')
  const jsonStart = start + marker.length
  const chunk = html.slice(jsonStart, jsonStart + 500000)
  let end = chunk.indexOf('};')
  while (end !== -1) {
    try {
      return JSON.parse(chunk.slice(0, end + 1))
    } catch {
      end = chunk.indexOf('};', end + 1)
    }
  }
  throw new Error('Could not parse YouTube page.')
}

function decodeXmlEntities(str) {
  const doc = new DOMParser().parseFromString(`<x>${str}</x>`, 'text/xml')
  return doc.documentElement?.textContent || str
}

function parseCaptionXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const nodes = doc.querySelectorAll('text')
  return Array.from(nodes)
    .map(n => decodeXmlEntities(n.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
}

function pickCaptionTrack(playerResponse) {
  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
  if (!Array.isArray(tracks) || tracks.length === 0) return null
  const english = tracks.find(t => (t.languageCode || '').startsWith('en'))
  return english || tracks[0]
}

async function fetchOEmbedTitle(videoId, signal) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  const text = await fetchViaProxy(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
    signal
  )
  return JSON.parse(text).title || ''
}

export async function fetchYouTubeData(videoId, signal = null) {
  try {
    const html = await fetchViaProxy(`https://www.youtube.com/watch?v=${videoId}`, signal)

    let playerResponse = null
    try {
      playerResponse = extractPlayerResponse(html)
    } catch {
      // YouTube changed its page structure — fall back to oEmbed for a title.
      const title = await fetchOEmbedTitle(videoId, signal)
      return { title, description: '', transcript: '' }
    }

    const status = playerResponse.playabilityStatus?.status
    if (status && status !== 'OK') throw new Error(NO_ACCESS_MSG)

    const title = playerResponse.videoDetails?.title || ''
    const description = playerResponse.videoDetails?.shortDescription || ''

    let transcript = ''
    const track = pickCaptionTrack(playerResponse)
    if (track?.baseUrl) {
      try {
        const xml = await fetchViaProxy(track.baseUrl.replace(/\\u0026/g, '&'), signal)
        transcript = parseCaptionXml(xml)
      } catch (e) {
        if (e.name === 'AbortError') throw e
        // Caption fetch failed — proceed with title/description only.
      }
    }

    return { title, description, transcript }
  } catch (e) {
    if (e.name === 'AbortError') throw e
    if (e.message === NO_ACCESS_MSG) throw e
    throw new Error(EXTRACT_FAIL_MSG)
  }
}
