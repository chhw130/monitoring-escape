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
  {
    id: 'login1',
    name: 'LOG_IN 1점',
    brand: '키이스케이프',
    location: '강남',
  },
  {
    id: 'login2',
    name: 'LOG_IN 2점',
    brand: '키이스케이프',
    location: '강남',
  },
  {
    id: 'station',
    name: 'STATION점',
    brand: '키이스케이프',
    location: '강남',
  },
  {
    id: 'memorycompany',
    name: '메모리컴퍼니',
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
  {
    id: 'login1-moneypackage', name: '머니머니패키지', emoji: '💰',
    branchId: 'login1', branch: 'LOG_IN 1점',
    openDaysAhead: 6, openHour: 10,
    doing: 7,
    zizumNum: '19', themeNum: '60', themeInfoNum: '38',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=19&theme_num=60&theme_info_num=38',
  },
  {
    id: 'login1-forfree', name: 'FOR FREE', emoji: '🆓',
    branchId: 'login1', branch: 'LOG_IN 1점',
    openDaysAhead: 6, openHour: 10,
    doing: 7,
    zizumNum: '19', themeNum: '63', themeInfoNum: '41',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=19&theme_num=63&theme_info_num=41',
  },
  {
    id: 'login2-backscene', name: 'BACK TO THE SCENE+', emoji: '🎬',
    branchId: 'login2', branch: 'LOG_IN 2점',
    openDaysAhead: 6, openHour: 10,
    doing: 7,
    zizumNum: '20', themeNum: '61', themeInfoNum: '40',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=20&theme_num=61&theme_info_num=40',
  },
  {
    id: 'login2-gentlemonday', name: 'A GENTLE MONDAY', emoji: '🌅',
    branchId: 'login2', branch: 'LOG_IN 2점',
    openDaysAhead: 6, openHour: 10,
    doing: 7,
    zizumNum: '20', themeNum: '64', themeInfoNum: '42',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=20&theme_num=64&theme_info_num=42',
  },
  {
    id: 'station-moneyproperty', name: '머니머니부동산', emoji: '🏢',
    branchId: 'station', branch: 'STATION점',
    openDaysAhead: 6, openHour: 11, openMinute: 30,
    doing: 7,
    zizumNum: '22', themeNum: '65', themeInfoNum: '43',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=22&theme_num=65&theme_info_num=43',
  },
  {
    id: 'station-myroom', name: '내 방', emoji: '🛋️',
    branchId: 'station', branch: 'STATION점',
    openDaysAhead: 6, openHour: 11, openMinute: 30,
    doing: 7,
    zizumNum: '22', themeNum: '66', themeInfoNum: '44',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=22&theme_num=66&theme_info_num=44',
  },
  {
    id: 'station-nostalgiavista', name: 'NOSTALGIA VISTA', emoji: '🌃',
    branchId: 'station', branch: 'STATION점',
    openDaysAhead: 6, openHour: 11, openMinute: 30,
    doing: 7,
    zizumNum: '22', themeNum: '67', themeInfoNum: '45',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=22&theme_num=67&theme_info_num=45',
  },
  {
    id: 'memory-filmbyeddy', name: 'FILM BY EDDY', emoji: '🎞️',
    branchId: 'memorycompany', branch: '메모리컴퍼니',
    openDaysAhead: 6, openHour: 10, openMinute: 30,
    doing: 7,
    zizumNum: '18', themeNum: '57', themeInfoNum: '34',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=18&theme_num=57&theme_info_num=34',
  },
  {
    id: 'memory-filmbysteve', name: 'FILM BY STEVE', emoji: '🏦',
    branchId: 'memorycompany', branch: '메모리컴퍼니',
    openDaysAhead: 6, openHour: 10, openMinute: 30,
    doing: 7,
    zizumNum: '18', themeNum: '58', themeInfoNum: '35',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=18&theme_num=58&theme_info_num=35',
  },
  {
    id: 'memory-filmbybob', name: 'FILM BY BOB', emoji: '🧹',
    branchId: 'memorycompany', branch: '메모리컴퍼니',
    openDaysAhead: 6, openHour: 10, openMinute: 30,
    doing: 7,
    zizumNum: '18', themeNum: '59', themeInfoNum: '36',
    reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=18&theme_num=59&theme_info_num=36',
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
      times.length > 0 && isBookable(dateStr, theme.openDaysAhead, theme.openHour, theme.openMinute ?? 0)
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
