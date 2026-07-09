// Bump the app version by one patch on each deploy, rolling the patch into the
// minor at 10 (…0.0.9 → 0.1.0). Run by the "predeploy" npm script before build.
// Major stays manual — bump it in package.json for a real release.
import { readFileSync, writeFileSync } from 'fs'

const path = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(readFileSync(path, 'utf-8'))

let [major = 0, minor = 0, patch = 0] = pkg.version.split('.').map(n => parseInt(n, 10) || 0)
patch += 1
if (patch > 9) { patch = 0; minor += 1 }

pkg.version = `${major}.${minor}.${patch}`
writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n')
console.log(`Version bumped to ${pkg.version}`)
