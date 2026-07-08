// Recipe Box fetch proxy — server-side URL fetcher for recipe import.
//
// The app's browser can't scrape Instagram/TikTok (login walls, blocked public
// CORS proxies). This Worker fetches the target with a real browser User-Agent
// and, for Instagram, uses the auth-free /embed/ endpoint. It stays dumb: fetch
// and return raw text; all recipe parsing happens in the app.

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// Browser origins allowed to call this proxy (limits casual abuse).
const ALLOWED_ORIGINS = new Set([
  'https://skeeblet.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
])

// Hosts that must never be fetched (SSRF guard) — this is otherwise an open
// fetcher. Blocks loopback, link-local, and RFC-1918 private ranges.
function isBlockedHost(hostname) {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0') return true
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true
  if (/^169\.254\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  if (h.endsWith('.internal') || h.endsWith('.local')) return true
  return false
}

function corsHeaders(origin) {
  const headers = { 'Access-Control-Allow-Methods': 'GET, OPTIONS' }
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Vary'] = 'Origin'
  }
  return headers
}

// Instagram post/reel/tv pages need a login; the /embed/ page exposes the
// caption without one.
function rewriteTarget(target) {
  const m = target.match(/instagram\.com\/(?:p|reel|tv)\/([\w-]+)/i)
  if (m) return `https://www.instagram.com/p/${m[1]}/embed/`
  return target
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin')
    const cors = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: cors })
    }

    const target = new URL(request.url).searchParams.get('url')
    if (!target) {
      return new Response('Missing url parameter', { status: 400, headers: cors })
    }

    let parsed
    try {
      parsed = new URL(target)
    } catch {
      return new Response('Invalid url', { status: 400, headers: cors })
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return new Response('Only http(s) URLs are allowed', { status: 400, headers: cors })
    }
    if (isBlockedHost(parsed.hostname)) {
      return new Response('Blocked host', { status: 403, headers: cors })
    }

    try {
      const upstream = await fetch(rewriteTarget(target), {
        headers: {
          'User-Agent': BROWSER_UA,
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        cf: { cacheTtl: 3600, cacheEverything: true },
        redirect: 'follow',
      })

      if (!upstream.ok) {
        // Non-2xx → let the app's fetchViaProxy fall through to the next proxy.
        return new Response(`Upstream returned ${upstream.status}`, {
          status: 502,
          headers: cors,
        })
      }

      const body = await upstream.text()
      return new Response(body, {
        status: 200,
        headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    } catch {
      return new Response('Fetch failed', { status: 502, headers: cors })
    }
  },
}
