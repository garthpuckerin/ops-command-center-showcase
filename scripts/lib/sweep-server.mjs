/* Shared lifecycle for the layout sweeps: build the LOCAL candidate into its
 * own outDir, serve it with `vite preview --strictPort` on 127.0.0.1, run the
 * sweep, and always kill the preview server in a `finally` (pass, fail or
 * throw). Ported from janus-showcase/scripts — the gate measures the build
 * that would ship, not the dev server.
 *
 * Set BASE_URL to sweep an already-running server instead (e.g. a preview
 * deploy); nothing is built or spawned then.
 */
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const VITE_BIN = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')

function runVite(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [VITE_BIN, ...args], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] })
    child.once('error', rejectRun)
    child.once('exit', (code, signal) => {
      if (code === 0 && signal === null) resolveRun()
      else rejectRun(new Error(`vite ${args.join(' ')} exited with ${signal ? `signal ${signal}` : `code ${code}`}`))
    })
  })
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now()
  for (;;) {
    try {
      await fetch(url)
      return
    } catch {
      if (Date.now() - startedAt > timeoutMs) throw new Error(`Timed out waiting for ${url}`)
      await new Promise((r) => setTimeout(r, 300))
    }
  }
}

/** Run `fn(baseUrl)` against a freshly built preview (or BASE_URL). */
export async function withPreviewServer({ port, outDir }, fn) {
  if (process.env.BASE_URL) return fn(process.env.BASE_URL.replace(/\/$/, ''))
  await runVite(['build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'])
  // `--host 127.0.0.1` pins the bind address to match the URL exactly —
  // `localhost` can resolve to ::1 first and the fetch never sees the server.
  const preview = spawn(process.execPath, [VITE_BIN, 'preview', '--outDir', outDir, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' })
  let earlyExit = null
  preview.once('exit', (code) => { if (code !== null && code !== 0) earlyExit = new Error(`vite preview exited early with code ${code}`) })
  const base = `http://127.0.0.1:${port}`
  try {
    await waitForServer(base)
    const result = await fn(base)
    if (earlyExit) throw earlyExit
    return result
  } finally {
    preview.kill()
  }
}

/* Every context below the landing must start past it, as the lead, on the
 * flagship campaign — the exact keys src/app.jsx reads. */
export const ENTERED_KEY = 'ops:entered:v1'
export const UI_STATE_KEY = 'lms_ops_command_center_ui_state'

export function seedPastLanding(context, { role = 'lead', view = 'home', campaignId = 'camp-st-anne' } = {}) {
  return context.addInitScript(([enteredKey, uiKey, state]) => {
    try {
      localStorage.setItem(enteredKey, 'true')
      localStorage.setItem(uiKey, JSON.stringify(state))
    } catch { /* storage blocked — the app's own try/catch handles it */ }
  }, [ENTERED_KEY, UI_STATE_KEY, { role, view, campaignId }])
}

/* A FULL navigation to a hash route. A URL that differs only by its hash is
 * a same-document navigation in Chromium; the cache-buster forces a real
 * load so every check measures the route it names (see ISSUES 2026-09-27 —
 * the sweeps once re-scanned the home screen for every route). */
export async function gotoRoute(page, base, route, { query = '' } = {}) {
  const q = new URLSearchParams(query)
  q.set('_', String(Date.now()))
  await page.goto(`${base}/?${q.toString()}${route ? `#${route}` : ''}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(150)
}

/* The gate's OWN list of workstation surfaces — an independent oracle, not
 * an import of the app's DESK_ONLY_VIEWS, so deleting an entry from the app
 * cannot silently shrink what the gate checks. */
export const DESK_ONLY_ROUTES = ['imports', 'writebacks', 'scoring', 'ai', 'org-settings', 'new-campaign', 'people-invite']
export const DESK_ONLY_COPY = 'stays at the desk.'

/* Layout width at and above which the app is a workstation (template tier). */
export const WORKSTATION_MIN = 1024
