# Recipe Box fetch proxy (Cloudflare Worker)

A tiny server-side fetch proxy that makes recipe import from Instagram, TikTok,
and stubborn websites more reliable. The app's browser can't scrape those
(login walls, blocked public CORS proxies); this Worker fetches the target with
a real browser User-Agent — and, for Instagram, uses the auth-free `/embed/`
endpoint that exposes the caption.

It's **optional**. If it isn't configured, the app falls back to the free public
CORS proxies (`corsproxy.io`, `allorigins.win`) exactly as before.

## What it does

- `GET /?url=<encoded target URL>` → fetches the URL and returns the raw text.
- Rewrites Instagram post/reel/tv links to their `/embed/` page.
- Sends a desktop browser User-Agent and caches responses for 1 hour.
- CORS-restricted to the app's origin (+ localhost for dev); blocks private/loopback targets.
- All recipe parsing stays in the app — the Worker only retrieves.

## Deploy

Requires a free [Cloudflare account](https://dash.cloudflare.com/sign-up). From this `worker/` directory:

```sh
npx wrangler login      # opens a browser to authorize (one time)
npx wrangler deploy
```

Wrangler prints the live URL, e.g. `https://recipe-box-fetch.<your-subdomain>.workers.dev`.

## Wire it into the app

Add the URL to the app's `.env` (repo root — gitignored), then rebuild + redeploy:

```sh
# .env
VITE_FETCH_PROXY_URL=https://recipe-box-fetch.<your-subdomain>.workers.dev
```

```sh
npm run build && npm run deploy
```

The app prepends this proxy to its list, so it's tried first and falls back to
the public proxies if it's ever down or blocked.

## Local testing

```sh
npx wrangler dev
curl "http://localhost:8787/?url=https://www.instagram.com/p/SHORTCODE/"
```

## Notes / limits

- Free tier is 100k requests/day — far beyond this app's needs.
- Gets the post **caption**, not recipes spoken only in a video (that needs transcription).
- Unofficial scraping: Instagram may block Cloudflare egress IPs at any time. The
  app degrades gracefully to public proxies, so nothing hard-breaks.
- If you change the app's production origin, update `ALLOWED_ORIGINS` in `index.js`.
