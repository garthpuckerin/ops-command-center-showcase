#!/usr/bin/env node
/* Proof that a stylesheet reorganisation is a pure MOVE: build the app,
 * parse the BUILT CSS asset with postcss, and record every rule in order —
 * its at-rule context, selector and declarations. Then compare two snapshots:
 *
 *   node scripts/css-rules.mjs --out before.json      (on the old layout)
 *   node scripts/css-rules.mjs --compare before.json  (on the new layout)
 *
 * The compare fails unless, for EVERY selector, the sequence of its rules
 * (context + declarations) is identical — and reports whether the whole asset
 * is byte-identical and the global rule order unchanged. Learned from a
 * 2026-09-21 janus-showcase split that silently dropped a shared chip's rules.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import postcss from 'postcss'
import { ROOT } from './lib/sweep-server.mjs'

const OUT_DIR = 'dist-css-check'
const args = process.argv.slice(2)
const outFile = args[args.indexOf('--out') + 1]
const compareFile = args.includes('--compare') ? args[args.indexOf('--compare') + 1] : null

function snapshot() {
  const build = spawnSync(process.execPath, [join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', OUT_DIR, '--emptyOutDir', '--logLevel', 'error'], { cwd: ROOT, stdio: 'inherit' })
  if (build.status !== 0) throw new Error('vite build failed')
  const assets = join(ROOT, OUT_DIR, 'assets')
  const cssFiles = readdirSync(assets).filter((f) => f.endsWith('.css'))
  if (cssFiles.length !== 1) throw new Error(`expected one built CSS asset, found ${cssFiles.length}`)
  const css = readFileSync(join(assets, cssFiles[0]), 'utf8')
  const rules = []
  postcss.parse(css).walk((node) => {
    if (node.type !== 'rule' && !(node.type === 'atrule' && !node.nodes)) return
    const context = []
    for (let p = node.parent; p && p.type !== 'root'; p = p.parent) if (p.type === 'atrule') context.unshift(`@${p.name} ${p.params}`)
    const decls = node.nodes ? node.nodes.filter((d) => d.type === 'decl').map((d) => `${d.prop}:${d.value}${d.important ? '!important' : ''}`) : []
    rules.push({ context: context.join(' / '), selector: node.type === 'rule' ? node.selector : `@${node.name} ${node.params}`, decls })
  })
  return { sha256: createHash('sha256').update(css).digest('hex'), bytes: css.length, rules }
}

const now = snapshot()
if (!compareFile) {
  writeFileSync(outFile, JSON.stringify(now))
  console.log(`wrote ${now.rules.length} rules (${now.bytes} bytes, sha256 ${now.sha256.slice(0, 16)}…) to ${outFile}`)
  process.exit(0)
}

const before = JSON.parse(readFileSync(compareFile, 'utf8'))
const key = (r) => `${r.context} | ${r.decls.join(';')}`
const bySelector = (rules) => rules.reduce((m, r) => m.set(r.selector, [...(m.get(r.selector) || []), key(r)]), new Map())
const a = bySelector(before.rules)
const b = bySelector(now.rules)
const problems = []
for (const sel of new Set([...a.keys(), ...b.keys()])) {
  const x = a.get(sel) || []
  const y = b.get(sel) || []
  if (x.length !== y.length || x.some((v, i) => v !== y[i])) problems.push(`${sel}: ${x.length} rule(s) before, ${y.length} after${x.length === y.length ? ' (order or content differs)' : ''}`)
}
const sameOrder = before.rules.length === now.rules.length && before.rules.every((r, i) => r.selector === now.rules[i].selector && key(r) === key(now.rules[i]))
console.log(`before: ${before.rules.length} rules, ${before.bytes} bytes, sha256 ${before.sha256.slice(0, 16)}…`)
console.log(`after:  ${now.rules.length} rules, ${now.bytes} bytes, sha256 ${now.sha256.slice(0, 16)}…`)
console.log(`built asset byte-identical: ${before.sha256 === now.sha256 ? 'YES' : 'no'}`)
console.log(`global rule order identical: ${sameOrder ? 'YES' : 'no'}`)
console.log(`selectors compared: ${new Set([...a.keys(), ...b.keys()]).size}; per-selector differences: ${problems.length}`)
problems.slice(0, 40).forEach((p) => console.log(`  ✗ ${p}`))
process.exit(problems.length ? 1 : 0)
