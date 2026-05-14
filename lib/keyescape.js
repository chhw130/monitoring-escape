import { isBookable, getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const BASE_URL = 'https://www.keyescape.com'
const PROC_URL = `${BASE_URL}/controller/run_proc.php`
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

export const BRANCHES = [
  {
    id: 'whosthere',
    name: '후즈데어점',
    brand: '키이스케이프',
    location: '강남',
  },
]

export const THEMES = [
  {
    id: 'tutu', name: '투투 어드벤처', emoji: '🗺️',
    branchId: 'whosthere', branch: '후즈데어점',
    openDaysAhead: 6, openHour: 11,
    doing: 7,
    zizumNum: '23', themeNum: '69', themeInfoNum: '60',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=69&theme_info_num=60',
  },
  {
    id: 'ayako', name: 'AYAKO', emoji: '🎭',
    branchId: 'whosthere', branch: '후즈데어점',
    openDaysAhead: 6, openHour: 11,
    doing: 7,
    zizumNum: '23', themeNum: '71', themeInfoNum: '63',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=71&theme_info_num=63',
  },
  {
    id: 'goerok', name: '괴록', emoji: '👻',
    branchId: 'whosthere', branch: '후즈데어점',
    openDaysAhead: 6, openHour: 11,
    doing: 7,
    zizumNum: '23', themeNum: '70', themeInfoNum: '61',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=70&theme_info_num=61',
  },
]

async function _fetchSessionCookie(theme) {
  const url = `${BASE_URL}/reservation1.php?zizum_num=${theme.zizumNum}&theme_num=${theme.themeNum}&theme_info_num=${theme.themeInfoNum}`
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  return res.headers.get('set-cookie') ?? ''
}

// 동시에 여러 테마가 호출해도 HTTP 요청을 한 번만 보냄
let _sessionCookiePromise = null
function getSessionCookie(theme) {
  if (!_sessionCookiePromise) {
    _sessionCookiePromise = _fetchSessionCookie(theme).finally(() => { _sessionCookiePromise = null })
  }
  return _sessionCookiePromise
}

async function fetchAvailableTimesForDate(cookie, theme, dateStr) {
  const body = new URLSearchParams({
    t: 'get_theme_time',
    date: dateStr,
    zizumNum: theme.zizumNum,
    themeNum: theme.themeNum,
    endDay: '0',
  })

  try {
    const res = await fetch(PROC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie,
        'Referer': `${BASE_URL}/reservation1.php?zizum_num=${theme.zizumNum}&theme_num=${theme.themeNum}&theme_info_num=${theme.themeInfoNum}`,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': UA,
      },
      body: body.toString(),
    })
    const data = await res.json()
    if (!data.status) { return [] }
    return data.data
      .filter(item => item.enable === 'Y')
      .map(item => `${item.hh}:${item.mm}`)
  } catch {
    return []
  }
}

export async function fetchThemeSlots(themeId, skipDows = new Set()) {
  const theme = THEMES.find(t => t.id === themeId)
  if (!theme) { throw new Error(`Unknown theme: ${themeId}`) }

  const dates = filterSkipDays(getDateRange(theme.doing), skipDows)
  const cookie = await getSessionCookie(theme)

  const results = await Promise.all(
    dates.map(async (dateStr) => {
      const times = await fetchAvailableTimesForDate(cookie, theme, dateStr)
      return [dateStr, times]
    })
  )

  return Object.fromEntries(
    results.filter(([dateStr, times]) =>
      times.length > 0 && isBookable(dateStr, theme.openDaysAhead, theme.openHour)
    )
  )
}

export async function fetchAllSlots() {
  const results = await Promise.all(
    THEMES.map(async (theme) => {
      const slots = await fetchThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
