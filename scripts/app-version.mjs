// Build-time app version, derived from git so every deploy gets a fresh
// number without committing a bump.
//
//   version = package.json version + one patch bump per commit since that
//             version line was last changed, rolling patch into minor at 10
//             (1.0.9 → 1.1.0). Major/minor/patch in package.json stay manual —
//             edit them for a real release and counting restarts from there.
//
// Needs full history (CI: actions/checkout with fetch-depth: 0). Falls back to
// the plain package.json version if git is unavailable or the clone is shallow.
import { execFileSync } from 'child_process'
import { readFileSync } from 'fs'

// Argument array, no shell: quoting rules differ between cmd.exe and sh.
function git(...args) {
  return execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
}

export function getAppVersion() {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
  const base = pkg.version || '0.0.0'
  try {
    if (git('rev-parse', '--is-shallow-repository') === 'true') {
      console.warn(`[app-version] shallow clone — using package.json version ${base} as-is`)
      return base
    }
    // Commit that last touched the version line; fall back to the root commit.
    const since =
      git('log', '-1', '--format=%H', '-G"version"', '--', 'package.json') ||
      git('rev-list', '--max-parents=0', 'HEAD')
    const bumps = parseInt(git('rev-list', '--count', `${since}..HEAD`), 10) || 0

    let [major = 0, minor = 0, patch = 0] = base.split('.').map(n => parseInt(n, 10) || 0)
    patch += bumps
    minor += Math.floor(patch / 10)
    patch %= 10
    return `${major}.${minor}.${patch}`
  } catch {
    console.warn(`[app-version] git unavailable — using package.json version ${base} as-is`)
    return base
  }
}
