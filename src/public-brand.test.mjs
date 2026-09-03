import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('public surfaces use the canonical Ops Command Center product name', async () => {
  const [index, landing, app] = await Promise.all([
    read('../index.html'),
    read('./Landing.jsx'),
    read('./app.jsx'),
  ])

  assert.match(index, /<title>Ops Command Center<\/title>/)
  assert.match(index, /<meta name="description" content="[^"]+" \/>/)
  assert.match(index, /<meta property="og:title" content="Ops Command Center — the tool I created in 2015, reimagined for today" \/>/)
  assert.match(index, /<meta property="og:image" content="https:\/\/garthpuckerin-ops-command-center\.vercel\.app\/og\.png" \/>/)
  assert.match(index, /<meta name="twitter:card" content="summary_large_image" \/>/)
  assert.match(landing, /<div className="brand-name">Ops <em>Command Center<\/em><\/div>/)
  assert.match(landing, /<span>Ops Command Center — campaign operations demo<\/span>/)
  assert.match(app, /<div className="brand-name">Ops <em>Command Center<\/em><\/div>/)

  const og = await stat(new URL('../public/og.png', import.meta.url))
  assert.ok(og.size > 0, 'public/og.png must be a non-empty social image')
})
