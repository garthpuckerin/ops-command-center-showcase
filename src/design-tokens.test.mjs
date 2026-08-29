// node --test  (npm run test:unit)
//
// Design-system guard: every color in index.css must come from a token, not a
// raw literal. This is the drift-proofing for the foundationalized token system
// (see docs/DESIGN-SYSTEM.md). A raw oklch()/rgba()/#hex is allowed ONLY when:
//   1. it is the value of a custom-property DEFINITION (`--name: <literal>`) —
//      the token source values live in :root / [data-mode] / [data-palette];
//   2. it is a pure black/white alpha (`oklch(0%|100% 0 0 / a)` / `rgba(0,0,0,a)`)
//      — presentational shadows and art hairlines that are theme-neutral;
//   3. it is inside a url() data-URI (e.g. an inline SVG icon stroke).
// Anything else is a usage-site literal that should be a token — fail, and name
// the line — so the drift that this pass just cleaned up cannot creep back.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css = fs.readFileSync(new URL('./index.css', import.meta.url), 'utf8')
const LITERAL = /(oklch\([^)]*\)|rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})/g

test('every color is a token — no raw literals outside definitions (design-system guard)', () => {
  const offenders = []
  css.split('\n').forEach((line, i) => {
    const code = line.replace(/\/\*.*?\*\//g, '')        // strip inline comments
    const noUrl = code.replace(/url\([^)]*\)/g, 'url()')  // whitelist url() data-URIs
    for (const m of noUrl.matchAll(LITERAL)) {
      const lit = m[0]
      const segment = noUrl.slice(0, m.index).split(';').pop()      // property this literal belongs to
      const isDefinition = /--[a-z0-9-]+\s*:/.test(segment)         // value of a custom property
      const isBWAlpha = /^oklch\((0|100)% 0 0 /.test(lit) || /^rgba\(\s*0\s*,\s*0\s*,\s*0/.test(lit)
      if (!isDefinition && !isBWAlpha) offenders.push(`  L${i + 1}: ${lit}   ${line.trim().slice(0, 72)}`)
    }
  })
  assert.equal(
    offenders.length, 0,
    `raw color literals found — route these through a token (or, if a shadow/hairline, use a pure black/white alpha):\n${offenders.join('\n')}`,
  )
})
