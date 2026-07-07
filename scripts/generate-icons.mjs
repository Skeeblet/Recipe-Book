// Rasterize public/favicon.svg into the PWA launcher icons.
// Run with: npm run icons
import { readFileSync } from 'fs'
import sharp from 'sharp'

const svg = readFileSync('public/favicon.svg', 'utf-8')

// Android adaptive (maskable) icons and iOS home-screen icons must fill the
// whole square — the OS applies its own mask/rounding, and transparent
// corners render black on iOS. The art already sits inside the safe zone.
const fullBleedSvg = svg.replace('rx="22"', 'rx="0"')

async function render(source, size, outfile) {
  await sharp(Buffer.from(source), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(outfile)
  console.log(`wrote ${outfile} (${size}x${size})`)
}

await render(svg, 192, 'public/icons/icon-192.png')
await render(svg, 512, 'public/icons/icon-512.png')
await render(fullBleedSvg, 180, 'public/icons/apple-touch-icon.png')

// Maskable: launchers may crop to a circle covering only the center 80%, so
// scale the art into that safe zone on a full-bleed background.
const art = await sharp(Buffer.from(fullBleedSvg), { density: 300 })
  .resize(410, 410)
  .png()
  .toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#D4622A' } })
  .composite([{ input: art, gravity: 'centre' }])
  .png()
  .toFile('public/icons/icon-maskable-512.png')
console.log('wrote public/icons/icon-maskable-512.png (512x512, safe-zone art)')
