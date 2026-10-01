/* One ruler for both layout sweeps. `measure` runs INSIDE the page (it must
 * stay self-contained — Playwright serialises it) and returns every number
 * the judges need from ONE moment; the judges run in Node.
 *
 * Visibility rule (benchmark, "The gate"): an element counts only if a person
 * could reach it by scrolling vertically — it must intersect the viewport
 * horizontally. A closed off-canvas drawer is not visible. */

/* Explicit, reviewed allowlist for the 44×44 floor: inline text links that
 * sit inside running prose only. Empty — every control clears 44×44. */
export const TOUCH_TARGET_ALLOWLIST = []

/* First real CONTENT on a screen: a card, a result row, a record — never a
 * control (the filter bar is a Card, so it is excluded by name). */
export const CONTENT_SELECTOR = '.screen .card:not(.filterbar), .screen .tbl-row, .screen .queue-row, .screen .person-card, .screen .report-card, .screen .empty-state'

export function measure({ contentSelector, allow }) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  // Chrome still lays out the contents of a CLOSED <details> (they are only
  // skipped for paint) and reports them visible — but nobody can see or tap
  // them, so they do not count. Only the closed disclosure's summary does.
  const inClosedDetails = (el) => {
    for (let d = el.closest('details:not([open])'); d; d = d.parentElement && d.parentElement.closest('details:not([open])')) {
      const summary = d.querySelector(':scope > summary')
      if (!summary || !summary.contains(el)) return true
    }
    return false
  }
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 1 && r.height > 1 && r.right > 1 && r.left < vw - 1 && s.visibility !== 'hidden' && s.display !== 'none' && !inClosedDetails(el)
  }
  const label = (el) => `${el.tagName.toLowerCase()}.${(typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).slice(0, 2).join('.')}`
  const fixedAncestor = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') return n
    }
    return null
  }

  // What a person sees of an element's right edge: text DELIBERATELY truncated
  // by an ellipsis ancestor (an ellipsised table cell) ends at that ancestor —
  // the reader sees "…", not a cut. Measuring the unclipped box once reported
  // truncated #setup cell text as "past the viewport" at 1024–1280px. Only an
  // ellipsis clipper counts: a hard overflow:hidden box that silently cuts
  // content off is still a defect, so it does not shorten the edge.
  const visibleRight = (el) => {
    let right = el.getBoundingClientRect().right
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (s.overflowX !== 'visible' && s.textOverflow === 'ellipsis') right = Math.min(right, n.getBoundingClientRect().right)
    }
    return right
  }

  const tooWide = []
  const sideScrollers = []
  const nestedScrollers = []
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    if (r.right > vw + 1 && s.position !== 'fixed' && visibleRight(el) > vw + 1) tooWide.push(`${label(el)} right=${Math.round(visibleRight(el))}`)
    if (/(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1) sideScrollers.push(label(el))
    // A dialog's own scroller (the More sheet) and native form controls that
    // scroll their own text are the sanctioned exceptions.
    if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1
      && !el.closest('[role="dialog"]') && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT') nestedScrollers.push(label(el))
  }

  const INTERACTIVE = 'button, a[href], select, input:not([type=hidden]), textarea, summary, [role="button"]'
  const small = []
  const controls = []
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    if (!visible(el)) continue
    controls.push(el)
    const cn = typeof el.className === 'string' ? el.className.split(/\s+/) : []
    if (allow.some((c) => cn.includes(c))) continue
    const r = el.getBoundingClientRect()
    if (r.width < 44 || r.height < 44) small.push(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}`)
  }

  // Nothing fixed may sit on top of an in-flow control that is on screen.
  const covered = []
  for (const el of controls) {
    if (fixedAncestor(el)) continue // the control IS fixed chrome
    const r = el.getBoundingClientRect()
    if (r.top < 0 || r.bottom > vh || r.left < 0 || r.right > vw) continue
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    if (!hit || hit === el || el.contains(hit) || hit.contains(el)) continue
    const cover = fixedAncestor(hit)
    if (cover) covered.push({ control: `${label(el)} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 28)}"`, cover: label(cover), coverIsTabBar: Boolean(cover.closest('nav[aria-label="Primary"]')) })
  }

  // Chrome that permanently costs VERTICAL space: fixed/sticky bars spanning
  // the width. A side rail costs width, not height.
  let chrome = 0
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el)
    if (s.position !== 'fixed' && s.position !== 'sticky') continue
    if (!visible(el) || el.closest('[role="dialog"]')) continue
    const r = el.getBoundingClientRect()
    if (r.width >= vw * 0.8 && r.height < vh * 0.5) chrome += r.height
  }

  const side = document.querySelector('aside.side')
  const tabs = document.querySelector('nav[aria-label="Primary"]')
  const tabBox = tabs && visible(tabs) ? tabs.getBoundingClientRect() : null
  const tabSizes = tabs ? [...tabs.querySelectorAll('button, a[href]')].filter(visible).map((t) => { const b = t.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)] }) : []
  const content = [...document.querySelectorAll(contentSelector)].filter(visible)
  const back = document.querySelector('[data-back-to-phone]')
  const backBox = back && visible(back) ? back.getBoundingClientRect() : null
  const topbar = document.querySelector('header.topbar')

  return {
    vw, vh,
    docWidth: document.documentElement.scrollWidth,
    docHeight: document.documentElement.scrollHeight,
    bodyHeight: document.body.scrollHeight,
    shell: side ? 'desktop' : tabs ? 'companion' : document.querySelector('.landing') ? 'landing' : 'none',
    desktopChrome: document.querySelectorAll('aside.side, header.topbar').length,
    tabBar: tabBox ? { top: Math.round(tabBox.top), bottom: Math.round(tabBox.bottom), left: Math.round(tabBox.left), width: Math.round(tabBox.width), height: Math.round(tabBox.height), position: getComputedStyle(tabs).position } : null,
    tabSizes,
    tooWide: tooWide.slice(0, 4), tooWideCount: tooWide.length,
    sideScrollers: [...new Set(sideScrollers)].slice(0, 4),
    nestedScrollers: [...new Set(nestedScrollers)].slice(0, 4),
    hasTable: Boolean(document.querySelector('table')),
    small: small.slice(0, 6), smallCount: small.length,
    covered: covered.slice(0, 6),
    chrome: Math.round(chrome),
    sideRail: tabBox && tabBox.height > tabBox.width ? Math.round(tabBox.width) : 0,
    firstContentTop: content.length ? Math.round(content[0].getBoundingClientRect().top + window.scrollY) : null,
    contentInFirstScreen: content.filter((el) => { const b = el.getBoundingClientRect(); return b.top + window.scrollY < vh && b.bottom + window.scrollY > 0 }).length,
    deskOnly: document.body.innerText.includes('stays at the desk.'),
    approveButtons: [...document.querySelectorAll('button')].filter((b) => /^(Approve|Reject)$/.test(b.innerText.trim())).length,
    backToPhone: backBox ? { left: Math.round(backBox.left), right: Math.round(backBox.right), top: Math.round(backBox.top), bottom: Math.round(backBox.bottom) } : null,
    sidebarWidth: side && visible(side) ? Math.round(side.getBoundingClientRect().width) : null,
    topbarHeight: topbar ? Math.round(topbar.getBoundingClientRect().height) : null,
  }
}

export async function measurePage(page) {
  return page.evaluate(measure, { contentSelector: CONTENT_SELECTOR, allow: TOUCH_TARGET_ALLOWLIST })
}

export async function scrollToEnd(page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(120)
}

export async function scrollToTop(page) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(80)
}

/* ── The phone-companion contract, one judge per numbered check ── */

export const judge = {
  chromeAbsent: (m) => ({ ok: m.desktopChrome === 0, detail: m.desktopChrome === 0 ? 'no aside.side / header.topbar mounted' : `${m.desktopChrome} desktop chrome element(s) mounted (aside.side / header.topbar)` }),
  tabBar: (m) => {
    if (!m.tabBar) return { ok: false, detail: 'no visible nav[aria-label="Primary"] tab bar' }
    const small = m.tabSizes.filter(([w, h]) => w < 44 || h < 44)
    const anchored = m.tabBar.position === 'fixed' && (m.sideRail ? true : Math.abs(m.tabBar.bottom - m.vh) <= 1)
    const ok = anchored && m.tabSizes.length > 0 && small.length === 0
    return { ok, detail: ok ? `${m.sideRail ? 'side rail' : 'bottom bar'}, fixed, ${m.tabSizes.length} tabs ≥44×44` : `position=${m.tabBar.position} bottom=${m.tabBar.bottom}/${m.vh} undersized=[${small.map(([w, h]) => `${w}×${h}`).join(', ')}]` }
  },
  firstContent: (m, { list = false } = {}) => {
    const topOk = m.firstContentTop !== null && m.firstContentTop <= m.vh * 0.35
    const countOk = !list || m.contentInFirstScreen >= 2
    return { ok: topOk && countOk, detail: `first content at ${m.firstContentTop ?? 'n/a'}px (≤35% = ${Math.round(m.vh * 0.35)})${list ? `, ${m.contentInFirstScreen} item(s) in the first screen (need ≥2)` : ''}` }
  },
  touch: (m) => ({ ok: m.smallCount === 0, detail: m.smallCount ? `${m.smallCount} under 44×44: ${m.small.join('; ')}` : 'every visible target ≥44×44' }),
  hygiene: (m) => {
    const p = []
    if (m.hasTable) p.push('a <table> is rendered')
    if (m.docWidth > m.vw + 1) p.push(`page scrolls sideways (${m.docWidth} > ${m.vw})`)
    if (m.tooWideCount) p.push(`${m.tooWideCount} element(s) past the edge: ${m.tooWide.join('; ')}`)
    if (m.sideScrollers.length) p.push(`sideways scroller(s): ${m.sideScrollers.join(', ')}`)
    if (m.nestedScrollers.length) p.push(`nested vertical scroller(s): ${m.nestedScrollers.join(', ')}`)
    if (Math.abs(m.bodyHeight - m.docHeight) > 1) p.push(`body is a scroller (${m.bodyHeight} vs ${m.docHeight})`)
    return { ok: p.length === 0, detail: p.length ? p.join('; ') : 'no table, no overflow, the document is the only scroller' }
  },
  /* At the top of a screen nothing fixed may cover a control (the tab bar is
   * exempt there — content scrolls up from under it); at the END of the
   * screen nothing at all may, the tab bar included. */
  notCovered: (top, end) => {
    const hits = [...top.covered.filter((c) => !c.coverIsTabBar), ...end.covered]
    return { ok: hits.length === 0, detail: hits.length ? hits.map((c) => `${c.control} under ${c.cover}`).join('; ') : 'no fixed element covers an in-flow control' }
  },
  length: (m, max = 3.5) => {
    const v = m.docHeight / m.vh
    return { ok: v <= max + 0.01, detail: `${v.toFixed(1)} viewports (≤${max})` }
  },
}
