// Hash routes — every screen and every People record is URL-addressable.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseHash, formatHash, sameRoute } from './route.js'

test('a bare view parses with no record', () => {
  assert.deepEqual(parseHash('#exceptions'), { view: 'exceptions', record: null })
  assert.deepEqual(parseHash('exceptions'), { view: 'exceptions', record: null })
})

test('a record route parses its id', () => {
  assert.deepEqual(parseHash('#people/l-001'), { view: 'people', record: 'l-001' })
})

test('an empty or garbage hash yields no view', () => {
  assert.deepEqual(parseHash(''), { view: null, record: null })
  assert.deepEqual(parseHash('#'), { view: null, record: null })
  assert.deepEqual(parseHash('#/'), { view: null, record: null })
  assert.deepEqual(parseHash('#<script>'), { view: null, record: null })
})

test('ids are decoded and re-encoded symmetrically', () => {
  const route = { view: 'people', record: 'a b/c' }
  assert.deepEqual(parseHash(formatHash(route)), route)
})

test('format round-trips and omits an empty record', () => {
  assert.equal(formatHash({ view: 'home', record: null }), '#home')
  assert.equal(formatHash({ view: 'people', record: 'l-002' }), '#people/l-002')
})

test('sameRoute compares view and record', () => {
  assert.equal(sameRoute({ view: 'people', record: null }, { view: 'people', record: null }), true)
  assert.equal(sameRoute({ view: 'people', record: 'x' }, { view: 'people', record: null }), false)
})
