// Surface resolution — which shell renders, which tier styles it, and whether
// desk authority applies. One source of truth for the breakpoint shared by the
// JS and the CSS (ISSUES 2026-09-27: JS said 720 while CSS said 980, so a
// phone rotated to landscape un-gated write-back approvals).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import {
  PHONE_MAX, WORKSTATION_MIN, isWorkstationWidth, deviceWidth, resolveSurface, viewportContentFor,
  surfaceAttributes, FORCED_DESKTOP_VIEWPORT_CONTENT, DEVICE_VIEWPORT_CONTENT,
} from './surface.js'

const phone = { screenWidth: 390, screenHeight: 844 }

test('the tiers are phone < 768, tablet companion 768–1023, workstation ≥ 1024', () => {
  assert.equal(PHONE_MAX, 767)
  assert.equal(WORKSTATION_MIN, 1024)
  assert.equal(isWorkstationWidth(1023), false)
  assert.equal(isWorkstationWidth(1024), true)
})

test('device width follows orientation and ignores the layout width', () => {
  assert.equal(deviceWidth({ ...phone, landscape: false }), 390)
  assert.equal(deviceWidth({ ...phone, landscape: true }), 844)
  assert.equal(deviceWidth({ screenWidth: 0, screenHeight: 0, landscape: false }), Number.POSITIVE_INFINITY)
})

test('a phone is the companion in BOTH orientations, with no desk authority', () => {
  for (const [w, h, landscape] of [[390, 664, false], [750, 342, true], [844, 390, true], [932, 430, true]]) {
    const s = resolveSurface({ layoutWidth: w, layoutHeight: h, deviceWidthPx: deviceWidth({ ...phone, landscape }), forced: false })
    assert.equal(s.surface, 'companion', `${w}×${h}`)
    assert.equal(s.deskAuthority, false, `${w}×${h} must not grant desk authority`)
  }
})

test('the whole 721–1023 gap band is the companion without authority', () => {
  for (let w = 721; w <= 1023; w += 1) {
    const s = resolveSurface({ layoutWidth: w, layoutHeight: 800, deviceWidthPx: 1920, forced: false })
    assert.equal(s.surface, 'companion', `width ${w}`)
    assert.equal(s.deskAuthority, false, `width ${w}`)
  }
})

test('tiers: phone below 768, tablet to 1023, workstation from 1024', () => {
  assert.equal(resolveSurface({ layoutWidth: 767, layoutHeight: 900, deviceWidthPx: 767, forced: false }).tier, 'phone')
  assert.equal(resolveSurface({ layoutWidth: 768, layoutHeight: 1024, deviceWidthPx: 768, forced: false }).tier, 'tablet')
  const ws = resolveSurface({ layoutWidth: 1024, layoutHeight: 768, deviceWidthPx: 1024, forced: false })
  assert.equal(ws.tier, 'workstation')
  assert.equal(ws.deskAuthority, true)
})

test('a short landscape screen is its own shape (tabs become a side rail)', () => {
  assert.equal(resolveSurface({ layoutWidth: 750, layoutHeight: 342, deviceWidthPx: 844, forced: false }).shortLandscape, true)
  assert.equal(resolveSurface({ layoutWidth: 390, layoutHeight: 664, deviceWidthPx: 390, forced: false }).shortLandscape, false)
  assert.equal(resolveSurface({ layoutWidth: 1280, layoutHeight: 400, deviceWidthPx: 1920, forced: false }).shortLandscape, false, 'never on the workstation')
})

test('the forced desktop on a small device is the workstation shell WITHOUT desk authority', () => {
  const s = resolveSurface({ layoutWidth: 1280, layoutHeight: 2179, deviceWidthPx: 390, forced: true })
  assert.equal(s.surface, 'workstation')
  assert.equal(s.forcedActive, true)
  assert.equal(s.deskAuthority, false)
  assert.equal(viewportContentFor({ forcedActive: true }), FORCED_DESKTOP_VIEWPORT_CONTENT)
})

// A desktop-WIDE layout on a phone-sized device without the force flag: the
// render right after "Back to the phone layout" (state cleared, viewport meta
// not yet re-laid-out) and a browser's own "Request desktop site". Authority
// follows the DEVICE, so neither may approve anything.
test('a wide layout on a small device never grants desk authority, forced or not', () => {
  for (const layoutWidth of [1024, 1280]) {
    const s = resolveSurface({ layoutWidth, layoutHeight: 2179, deviceWidthPx: 390, forced: false })
    assert.equal(s.deskAuthority, false, `layout ${layoutWidth} on a 390px device`)
    assert.equal(surfaceAttributes(s).authority, 'gated')
  }
})

test('a stored force is ignored on a device that is already workstation-wide', () => {
  const s = resolveSurface({ layoutWidth: 1440, layoutHeight: 900, deviceWidthPx: 1920, forced: true })
  assert.equal(s.forcedActive, false)
  assert.equal(s.deskAuthority, true)
  assert.equal(viewportContentFor({ forcedActive: false }), DEVICE_VIEWPORT_CONTENT)
})

test('the device viewport content is the one index.html ships', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.ok(html.includes(`content="${DEVICE_VIEWPORT_CONTENT}"`), 'index.html viewport meta drifted from surface.js')
})

test('surfaceAttributes is what the CSS reads', () => {
  const s = resolveSurface({ layoutWidth: 844, layoutHeight: 390, deviceWidthPx: 844, forced: false })
  assert.deepEqual(surfaceAttributes(s), { surface: 'companion', tier: 'tablet', shape: 'short-landscape', authority: 'gated' })
})

// The CSS must not type its own copy of a shell breakpoint: every rule that
// differs between phone, tablet and workstation keys off the attributes
// above. Width media queries are allowed only at/above the workstation tier
// (workstation-internal reflow, e.g. the topbar compacting at 1500px).
test('no stylesheet declares a width breakpoint below the workstation tier', () => {
  const dir = new URL('./', import.meta.url)
  const files = readdirSync(dir, { recursive: true }).filter(f => String(f).endsWith('.css'))
  const offenders = []
  for (const f of files) {
    const css = readFileSync(new URL(String(f).replace(/\\/g, '/'), dir), 'utf8')
    // Every width a media query can name: (max-width: 720px), (min-device-width:
    // 45em), range syntax (width <= 720px / 600px < width). em/rem = 16px.
    for (const media of css.matchAll(/@media([^{]*)\{/g)) {
      const params = media[1]
      const lengths = [
        ...[...params.matchAll(/(?:min|max)-(?:device-)?width\s*:\s*([\d.]+)(px|em|rem)/g)],
        ...[...params.matchAll(/(?:device-)?width\s*[<>]=?\s*([\d.]+)(px|em|rem)/g)],
        ...[...params.matchAll(/([\d.]+)(px|em|rem)\s*[<>]=?\s*(?:device-)?width/g)],
      ]
      for (const [, n, unit] of lengths) {
        const px = Number(n) * (unit === 'px' ? 1 : 16)
        if (px < WORKSTATION_MIN) offenders.push(`${f}: @media${params.trim()}`)
      }
    }
  }
  assert.deepEqual(offenders, [])
})
