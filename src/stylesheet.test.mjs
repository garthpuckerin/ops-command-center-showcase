// Stylesheet integrity gates (benchmark, "The post-Sep-24 cleanup" part 3).
// A split monolith fails silently: a moved block that never gets imported, or
// a comment banner spliced open that swallows a whole tier, drops rules with
// no error anywhere. These tests make each of those failures loud.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const SRC = dirname(fileURLToPath(import.meta.url))
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)])
const files = walk(SRC)
const cssFiles = files.filter((f) => f.endsWith('.css'))
const jsxFiles = files.filter((f) => /\.(jsx|js)$/.test(f) && !/\.test\./.test(f))
const rel = (f) => relative(SRC, f).replace(/\\/g, '/')

// Classes JSX may use without a rule of their own, each with its reason.
// Keep this short; every entry is a class nothing styles.
const UNSTYLED_ALLOWLIST = new Map([
  ['tbl-h', 'table header cell: its type and colour come from the .tbl-head row rule'],
  ['tbl-body', 'structural wrapper for table rows; the rows carry every rule'],
  ['invite-status', 'aria-live status slot sized by an inline min-height; no class rule needed'],
])

// CSS that ships inside a component as a string (the dev-only tweaks panel
// renders `<style>{__TWEAKS_STYLE}</style>`) counts as a stylesheet too.
function inlineStyleSheets() {
  return jsxFiles.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/const \w*STYLE\w* = `([^`]*)`/g)].map((m) => [f, m[1]]))
}

function cssClassNames() {
  const names = new Set()
  const sheets = [...cssFiles.map((f) => [f, readFileSync(f, 'utf8')]), ...inlineStyleSheets()]
  for (const [f, text] of sheets) {
    postcss.parse(text, { from: f }).walkRules((rule) => {
      for (const m of rule.selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) names.add(m[1])
    })
  }
  return names
}

/* Every class token written directly in a className — string attributes,
 * and the string/template literals inside a className={...} expression (cls(),
 * ternaries, `pill-${tone}`). A template slot becomes a PREFIX that some rule
 * must start with. Classes assembled into a variable first are not seen. */
function jsxClassTokens() {
  const found = new Map() // token -> first file
  const add = (token, file) => { if (token && !found.has(token)) found.set(token, file) }
  for (const f of jsxFiles) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(/className=(?:"([^"]*)"|\{)/g)) {
      if (m[1] !== undefined) { m[1].split(/\s+/).forEach((t) => add(t, rel(f))); continue }
      let depth = 1
      let i = m.index + m[0].length
      for (; i < src.length && depth > 0; i++) {
        if (src[i] === '{') depth++
        else if (src[i] === '}') depth--
      }
      const expr = src.slice(m.index + m[0].length, i - 1)
      for (const lit of expr.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
        // An argument to a method call (message.includes("failed")) is data,
        // not a class name; arguments to cls(...) are still read.
        if (/\.\w+\(\s*$/.test(expr.slice(0, lit.index))) continue
        const text = lit[1] ?? lit[2] ?? lit[3]
        for (const token of text.split(/\s+/)) {
          if (!token) continue
          if (token.includes('${')) add(`${token.slice(0, token.indexOf('${'))}*`, rel(f))
          else if (/^-?[_a-zA-Z][\w-]*$/.test(token)) add(token, rel(f))
        }
      }
    }
  }
  return found
}

test('every class used in JSX has a CSS rule (no orphan classes)', () => {
  const css = cssClassNames()
  const orphans = []
  for (const [token, file] of jsxClassTokens()) {
    if (UNSTYLED_ALLOWLIST.has(token)) continue
    const ok = token.endsWith('*')
      ? [...css].some((c) => c.startsWith(token.slice(0, -1)))
      : css.has(token)
    if (!ok) orphans.push(`${token} (${file})`)
  }
  assert.deepEqual(orphans.sort(), [], 'classes with no rule in any stylesheet')
})

test('every allowlisted unstyled class is still used and still unstyled', () => {
  const css = cssClassNames()
  const used = jsxClassTokens()
  for (const [token] of UNSTYLED_ALLOWLIST) {
    assert.ok(used.has(token), `${token} is allowlisted but no longer used — remove it`)
    assert.ok(!css.has(token), `${token} is allowlisted but now has a rule — remove it`)
  }
})

test('every stylesheet parses, and no comment has swallowed a rule', () => {
  for (const f of cssFiles) {
    const root = postcss.parse(readFileSync(f, 'utf8'), { from: f })
    root.walkComments((c) => {
      // A rule inside a comment: `selector { prop: value; }` — the shape a
      // spliced or unclosed banner leaves behind when it eats real CSS.
      assert.ok(!/[.#:\w\])]\s*\{[^}]*:[^}]*;?\s*\}/.test(c.text), `${rel(f)}: a comment contains a CSS rule — was a block swallowed?\n${c.text.slice(0, 200)}`)
    })
  }
})

test('every stylesheet is reachable from the entry (none silently dropped)', () => {
  const entry = join(SRC, 'main.jsx')
  const reached = new Set()
  const visit = (file) => {
    const text = readFileSync(file, 'utf8')
    const pattern = file.endsWith('.css') ? /@import\s+['"]([^'"]+)['"]/g : /import\s+['"]([^'"]+\.css)['"]/g
    for (const m of text.matchAll(pattern)) {
      const target = resolve(dirname(file), m[1])
      if (!reached.has(target)) { reached.add(target); visit(target) }
    }
  }
  visit(entry)
  const unreached = cssFiles.filter((f) => !reached.has(resolve(f))).map(rel)
  assert.deepEqual(unreached, [], 'stylesheets nothing imports — their rules never ship')
})
