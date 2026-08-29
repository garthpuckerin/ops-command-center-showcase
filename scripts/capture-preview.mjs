// Capture identity-clean preview media (screenshots + a paced walkthrough video)
// from the Ops Command Center (Epic Go-Live readiness demo). Run with the dev server up on :3200:
//   pnpm --filter ops-command-center dev   (in another shell)
//   PREVIEW_URL=http://localhost:3200 pnpm --filter ops-command-center exec node scripts/capture-preview.mjs
//
// The walkthrough is a deliberate tour using only known-good selectors with
// short, explicit pauses for pacing. Optional flourishes use fail-fast timeouts
// so a missing selector can never freeze the recording.
import { chromium } from '@playwright/test'
import { mkdir, copyFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..', '..')
const mediaDir = path.resolve(repoRoot, 'apps', 'web', 'public', 'media', 'ops-command-center')
const videoDir = path.resolve(mediaDir, 'video-raw')
const baseURL = process.env.PREVIEW_URL || 'http://localhost:3200'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  await mkdir(mediaDir, { recursive: true })
  await mkdir(videoDir, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    recordVideo: { dir: videoDir, size: { width: 1440, height: 1000 } },
  })
  context.setDefaultTimeout(8000) // hard cap: no step can hang the recording

  // Clear persisted UI state so we always start fresh from the default view
  await context.addInitScript(() => {
    window.localStorage.removeItem('lms_ops_command_center_ui_state')
  })

  const page = await context.newPage()

  const shot = async (name) => {
    await page.screenshot({ path: path.join(mediaDir, name), fullPage: false })
    console.log('  captured', name)
  }

  // Optional flourish: never throws, short timeout so it can't freeze the video.
  const optional = async (label, fn) => {
    try { await fn() } catch (e) { console.log(`  ~ optional "${label}" skipped: ${e.message}`) }
  }

  // ── 1. Command Center overview (home) ────────────────────────────────────
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await wait(1500)
  await shot('ops-command-overview.png')
  await optional('scroll overview', async () => { await page.mouse.wheel(0, 400); await wait(800); await page.mouse.wheel(0, -400) })
  await wait(800)

  // ── 2. Readiness ────────────────────────────────────────────────────────
  await page.click('[data-tour="nav-readiness"]', { timeout: 6000 })
  await wait(1300)
  await shot('ops-command-readiness.png')
  await optional('scroll readiness', async () => { await page.mouse.wheel(0, 500); await wait(900); await page.mouse.wheel(0, -500) })
  await wait(700)

  // ── 3. Departments ───────────────────────────────────────────────────────
  await page.click('[data-tour="nav-departments"]', { timeout: 6000 })
  await wait(1200)
  await shot('ops-command-departments.png')
  await wait(700)

  // ── 4. Training Matrix ───────────────────────────────────────────────────
  await page.click('[data-tour="nav-matrix"]', { timeout: 6000 })
  await wait(1300)
  await shot('ops-command-matrix.png')
  await optional('scroll matrix', async () => { await page.mouse.wheel(0, 400); await wait(800); await page.mouse.wheel(0, -400) })
  await wait(700)

  // ── 5. Exceptions (risk queue) ──────────────────────────────────────────
  await page.click('[data-tour="nav-exceptions"]', { timeout: 6000 })
  await wait(1200)
  await shot('ops-command-exceptions.png')
  await wait(700)

  // ── 6. Timeline ──────────────────────────────────────────────────────────
  await page.click('[data-tour="nav-timeline"]', { timeout: 6000 })
  await wait(1300)
  await shot('ops-command-timeline.png')
  await wait(700)

  // ── 7. People Directory ──────────────────────────────────────────────────
  await page.click('[data-tour="nav-people"]', { timeout: 6000 })
  await wait(1200)
  await shot('ops-command-people.png')
  await optional('scroll people', async () => { await page.mouse.wheel(0, 400); await wait(800); await page.mouse.wheel(0, -400) })
  await wait(700)

  // ── 8. Reports ───────────────────────────────────────────────────────────
  await optional('reports', async () => {
    await page.click('[data-tour="nav-reports"]', { timeout: 5000 })
    await wait(1200)
    await shot('ops-command-reports.png')
    await wait(700)
  })

  // ── Wrap up — close context to finalise video ────────────────────────────
  const video = page.video()
  await context.close()
  if (video) {
    await copyFile(await video.path(), path.join(mediaDir, 'ops-command-center-walkthrough.webm'))
    console.log('  captured ops-command-center-walkthrough.webm')
  }
  await rm(videoDir, { recursive: true, force: true })
  await browser.close()
  console.log('done →', mediaDir)
}

main().catch((e) => { console.error(e); process.exit(1) })
