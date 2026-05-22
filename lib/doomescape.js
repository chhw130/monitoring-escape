import https from 'node:https'
import { isBookable, getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

// doomescape.com은 자체 서명 인증서를 사용하므로 node:https + rejectUnauthorized: false
const HOSTNAME   = 'doomescape.com'
const BASE_URL   = `https://${HOSTNAME}`
const RANGE_DAYS = 7
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const DOOMESCAPE_BRANCHES = [
  { id: 'doomescape-1',    name: '1호점',       brand: '둠이스케이프', location: '인천' },
  { id: 'doomescape-fear', name: 'FEAR점(수원)', brand: '둠이스케이프', location: '수원' },
]

export const DOOMESCAPE_THEMES = [
  {
    id: 'doomescape-1-napolitan', name: '나폴리탄', emoji: '🍝',
    branchId: 'doomescape-1', branch: '1호점',
    themeName: '나폴리탄', zizum: 1,
    openDaysAhead: 5, openHour: 23, openMinute: 45,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_zizum=1`,
  },
  {
    id: 'doomescape-fear-husabi', name: '허수아비', emoji: '🌾',
    branchId: 'doomescape-fear', branch: 'FEAR점(수원)',
    themeName: '허수아비', zizum: 4,
    openDaysAhead: 5, openHour: 23, openMinute: 45,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_zizum=4`,
  },
  {
    id: 'doomescape-fear-obscura', name: '옵스큐라', emoji: '🔮',
    branchId: 'doomescape-fear', branch: 'FEAR점(수원)',
    themeName: '옵스큐라', zizum: 4,
    openDaysAhead: 5, openHour: 23, openMinute: 45,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_zizum=4`,
  },
  {
    id: 'doomescape-fear-daytour', name: '데이투어', emoji: '🚌',
    branchId: 'doomescape-fear', branch: 'FEAR점(수원)',
    themeName: '데이투어', zizum: 4,
    openDaysAhead: 5, openHour: 23, openMinute: 45,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_zizum=4`,
  },
]

function fetchPage(dateStr, zizum) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: HOSTNAME,
        path: `/layout/res/home.php?go=rev.make&s_zizum=${zizum}&rev_days=${dateStr}`,
        method: 'GET',
        rejectUnauthorized: false,
        headers: { 'User-Agent': UA },
      },
      (res) => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      }
    )
    req.on('error', reject)
    req.end()
  })
}

// (날짜, 지점) 조합 캐시 — 같은 페이지를 여러 테마가 동시에 요청해도 한 번만 fetch
const _pageCache = new Map()
function getPage(dateStr, zizum) {
  const key = `${dateStr}:${zizum}`
  if (!_pageCache.has(key)) {
    _pageCache.set(
      key,
      fetchPage(dateStr, zizum).finally(() => _pageCache.delete(key))
    )
  }
  return _pageCache.get(key)
}

// HTML에서 특정 테마의 예약 가능 시간 목록 추출
function parseAvailableSlots(html, themeName) {
  const times = []
  const tmBoxRegex = /<div class="tm_box">([\s\S]*?)<!--\s*tm_box\s*-->/g
  let boxMatch
  while ((boxMatch = tmBoxRegex.exec(html)) !== null) {
    const section = boxMatch[1]
    const nameMatch = section.match(/<p class="name">([^<]+)<\/p>/)
    if (!nameMatch || nameMatch[1].trim() !== themeName) continue

    const liOnRegex = /<li class="on"><a href[^>]+>([\s\S]*?)<\/li>/g
    let liMatch
    while ((liMatch = liOnRegex.exec(section)) !== null) {
      const timeMatch = liMatch[1].match(/<span class="num">(\d{2}:\d{2})/)
      if (timeMatch) times.push(timeMatch[1])
    }
    break
  }
  return times.sort()
}

export async function fetchDoomescapeThemeSlots(themeId, skipDows = new Set()) {
  const theme = DOOMESCAPE_THEMES.find(t => t.id === themeId)
  if (!theme) { throw new Error(`Unknown doomescape theme: ${themeId}`) }

  const dates = filterSkipDays(
    getDateRange(RANGE_DAYS).filter(d => isBookable(d, theme.openDaysAhead, theme.openHour, theme.openMinute)),
    skipDows
  )
  const results = await Promise.all(
    dates.map(async (dateStr) => {
      try {
        const html = await getPage(dateStr, theme.zizum)
        return [dateStr, parseAvailableSlots(html, theme.themeName)]
      } catch {
        return [dateStr, []]
      }
    })
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllDoomescapeSlots() {
  const results = await Promise.all(
    DOOMESCAPE_THEMES.map(async (theme) => {
      const slots = await fetchDoomescapeThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
