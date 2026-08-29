// node --test  (npm run test:unit)
//
// The fixture dataset is authored in anchor-relative time: dates.js shifts every
// date by one constant offset so the 2026-05-28 authoring anchor lands on the
// real "today". These invariants therefore hold on EVERY viewing date — a
// violation is a defect a visitor eventually sees. (A batch of historical events
// authored 4 days *after* the anchor rendered with future timestamps until this
// gate caught the whole class at once — see the future-date walk below.)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LMS_DATA as D } from './data.js'
import { TODAY, iso } from './dates.js'

const TODAY_ISO = iso(TODAY)
const day = (v) => String(v).slice(0, 10)

test('department rollups reconcile (complete + in_progress + not_started = required)', () => {
  for (const dep of D.departments) {
    const sum = dep.complete + dep.in_progress + dep.not_started
    assert.equal(sum, dep.required, `dept ${dep.id}: ${sum} rolled up vs required ${dep.required}`)
    assert.ok(dep.complete >= 0 && dep.complete <= dep.required, `dept ${dep.id}: complete outside [0, required]`)
    assert.ok(dep.exceptions >= 0, `dept ${dep.id}: negative exception count`)
  }
})

test('campaign status is coherent with its go-live and readiness', () => {
  for (const c of D.campaigns) {
    assert.ok(c.readiness >= 0 && c.readiness <= 100, `campaign ${c.id}: readiness ${c.readiness} out of range`)
    if (c.status === 'Active') {
      assert.ok(day(c.goLiveDate) >= TODAY_ISO,
        `campaign ${c.id}: Active but go-live ${day(c.goLiveDate)} already passed — would render negative days-to-go-live`)
    }
    if (c.status === 'Draft') {
      assert.ok(day(c.goLiveDate) > TODAY_ISO, `campaign ${c.id}: Draft but go-live is not in the future`)
    }
  }
})

test('sessions: over-capacity is always flagged, and attendance never exceeds registration', () => {
  for (const s of D.sessions) {
    if (s.registered > s.capacity) {
      // Over-capacity is a modeled conflict, not a data error — but it MUST be surfaced.
      assert.ok(s.conflict, `session ${s.id}: ${s.registered}>${s.capacity} registered but no conflict flag`)
    }
    assert.ok(s.attended <= s.registered, `session ${s.id}: attended ${s.attended} > registered ${s.registered}`)
  }
})

test('imports: accepted + errors never exceed the row count', () => {
  for (const i of D.imports) {
    const accepted = i.accepted_count ?? 0
    const errors = i.error_count ?? i.failed_row_count ?? 0
    assert.ok(accepted + errors <= i.row_count,
      `import ${i.id || i.filename}: accepted ${accepted} + errors ${errors} > rows ${i.row_count}`)
  }
})

test('no historical event is dated in the future (structural walk)', () => {
  // Re-derives the whole answer mechanically: any field whose name marks a past
  // event must not carry a future date. Catches new fixtures, not just today's.
  const PAST = /(created_at|uploaded|last_import_at|certified|decided_at|imported_at|completed_at|resolved_at|_ts)$/i
  const offenders = []
  const walk = (o, path) => {
    if (o == null) return
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${path}[${i}]`))
    if (typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === 'string' && PAST.test(k)) {
          if (day(v) > TODAY_ISO) offenders.push(`${path}.${k} = ${day(v)}`)
        } else walk(v, `${path}.${k}`)
      }
    }
  }
  walk(D, 'D')
  assert.equal(offenders.length, 0, `future-dated historical events: ${offenders.join('; ')}`)
})

test('narrative fixtures carry no absolute calendar dates (they go stale)', () => {
  const MONTH_DAY = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/
  const texts = [
    ...D.exceptions.map((e) => e.notes || ''),
    ...(D.insights || []).flatMap((i) => [i.title, i.body].filter(Boolean)),
    ...(D.notifications || []).map((n) => n.message || n.body || ''),
  ]
  for (const s of texts) {
    assert.ok(!MONTH_DAY.test(s), `hardcoded calendar date in fixture prose: "${s}"`)
  }
})

test('exceptions reference a real department', () => {
  const deptIds = new Set(D.departments.map((d) => d.id))
  for (const e of D.exceptions) {
    assert.ok(deptIds.has(e.department_id), `exception ${e.id}: unknown department ${e.department_id}`)
  }
})
