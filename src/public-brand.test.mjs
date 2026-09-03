import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('public surfaces use the canonical Ops Command Center product name', async () => {
  const [index, landing, app] = await Promise.all([
    read('../index.html'),
    read('./Landing.jsx'),
    read('./app.jsx'),
  ])

  assert.match(index, /<title>Ops Command Center<\/title>/)
  assert.match(landing, /<div className="brand-name">Ops <em>Command Center<\/em><\/div>/)
  assert.match(landing, /<span>Ops Command Center — campaign operations demo<\/span>/)
  assert.match(app, /<div className="brand-name">Ops <em>Command Center<\/em><\/div>/)
})
