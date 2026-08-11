import { getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const BASE_URL   = 'https://point-nine.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const RANGE_DAYS = 14
const ZIZUM      = 5 // 건대점

export const POINTNINE_BRANCHES = [
  { id: 'pointnine-kondae', name: '건대점', brand: '포인트나인', location: '건대' },
]

export const POINTNINE_THEMES = [
  {
    id: 'pointnine-jackintheshow', name: 'Jack in the Show', emoji: '🃏',
    branchId: 'pointnine-kondae', branch: '건대점',
    themeName: 'Jack in the Show',
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_zizum=${ZIZUM}`,
  },
  {
    id: 'pointnine-return', name: 'RETURN', emoji: '🔁',
    branchId: 'pointnine-kondae', branch: '건대점',
    themeName: 'RETURN',
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_zizum=${ZIZUM}`,
  },
  {
    id: 'pointnine-alba', name: 'ALBA', emoji: '🥷',
    branchId: 'pointnine-kondae', branch: '건대점',
    themeName: 'ALBA',
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_zizum=${ZIZUM}`,
  },
]

function isFutureSlot(dateStr, timeStr) {
  return new Date() < new Date(`${dateStr}T${timeStr}:00+09:00`)
}

// 날짜별 페이지 캐시 — 같은 날짜를 여러 테마가 동시에 요청해도 한 번만 fetch
const _pageCache = new Map()
function getPage(dateStr) {
  if (!_pageCache.has(dateStr)) {
    _pageCache.set(dateStr, _fetchPage(dateStr).finally(() => _pageCache.delete(dateStr)))
  }
  return _pageCache.get(dateStr)
}

async function _fetchPage(dateStr) {
  const res = await fetch(
    `${BASE_URL}/layout/res/home.php?go=rev.make&s_zizum=${ZIZUM}&rev_days=${dateStr}`,
    { headers: { 'User-Agent': UA } }
  )
  if (!res.ok) throw new Error(`pointnine 요청 실패: ${res.status}`)
  return res.text()
}

// 예약 오픈 기간이 아닌 날짜는 theme_box 자체가 렌더링되지 않으므로 빈 배열로 처리됨
function parseAvailableTimesForTheme(html, themeName) {
  const boxRegex = /<div class="theme_box">([\s\S]*?)(?=<div class="theme_box">|$)/g
  for (const boxMatch of html.matchAll(boxRegex)) {
    const section = boxMatch[1]
    const nameMatch = section.match(/<h3 class="h3_theme">([^<]+)<\/h3>/)
    if (!nameMatch) continue
    const name = nameMatch[1].replace(/\s*\([^)]*\)\s*$/, '').trim()
    if (name !== themeName) continue

    return [...section.matchAll(/<a href="home\.php\?go=rev\.make\.input[^"]*">\s*<span class="time">(\d{2}:\d{2})/g)]
      .map(m => m[1])
  }
  return []
}

async function fetchAvailableTimesForDate(theme, dateStr) {
  try {
    const html = await getPage(dateStr)
    return parseAvailableTimesForTheme(html, theme.themeName)
      .filter(time => isFutureSlot(dateStr, time))
      .sort()
  } catch {
    return []
  }
}

export async function fetchPointnineThemeSlots(themeId, skipDows = new Set()) {
  const theme = POINTNINE_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown pointnine theme: ${themeId}`)

  const dates = filterSkipDays(getDateRange(RANGE_DAYS), skipDows)
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllPointnineSlots() {
  const results = await Promise.all(
    POINTNINE_THEMES.map(async (theme) => {
      const slots = await fetchPointnineThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
