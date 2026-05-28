import { getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const BASE_URL   = 'https://zerohongdae.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const RANGE_DAYS = 14

export const ZEROHONGDAE_BRANCHES = [
  { id: 'zerohongdae', name: '홍대점', brand: '제로홍대', location: '홍대' },
]

export const ZEROHONGDAE_THEMES = [
  {
    id: 'zerohongdae-kkambang', name: '깜빵탈출 : WAY OUT', emoji: '🔒',
    branchId: 'zerohongdae', branch: '홍대점',
    themePK: 56,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/reservation/56`,
  },
]

// 세션 취득 (CSRF 토큰 + 쿠키) — 동시 호출 시 한 번만 fetch
let _sessionPromise = null
function getSession() {
  if (!_sessionPromise) {
    _sessionPromise = _fetchSession().finally(() => { _sessionPromise = null })
  }
  return _sessionPromise
}

async function _fetchSession() {
  const res = await fetch(`${BASE_URL}/reservation/56`, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
  })
  if (!res.ok) throw new Error(`zerohongdae 세션 취득 실패: ${res.status}`)
  const html = await res.text()

  const csrfMatch = html.match(/<meta name="csrf-token"[^>]*content="([^"]+)"/)
  if (!csrfMatch) throw new Error('zerohongdae CSRF 토큰 없음')
  const csrfToken = csrfMatch[1]

  const setCookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [...res.headers.entries()].filter(([k]) => k === 'set-cookie').map(([, v]) => v)
  const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ')

  return { csrfToken, cookieStr }
}

// 날짜별 API 응답 캐시 — 같은 날짜 요청 중복 방지
const _dateCache = new Map()
function getDateData(dateStr) {
  if (!_dateCache.has(dateStr)) {
    _dateCache.set(dateStr, _fetchDateData(dateStr).finally(() => _dateCache.delete(dateStr)))
  }
  return _dateCache.get(dateStr)
}

async function _fetchDateData(dateStr) {
  const { csrfToken, cookieStr } = await getSession()
  const res = await fetch(`${BASE_URL}/reservation/theme`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookieStr,
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/reservation/56`,
      'User-Agent': UA,
      'X-CSRF-TOKEN': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: `reservationDate=${dateStr}&name=&phone=&paymentType=1`,
  })
  if (!res.ok) throw new Error(`zerohongdae API 실패: ${res.status}`)
  return res.json()
}

function isFutureSlot(dateStr, timeStr) {
  return new Date() < new Date(`${dateStr}T${timeStr}:00+09:00`)
}

async function fetchAvailableTimesForDate(theme, dateStr) {
  try {
    const data = await getDateData(dateStr)
    const times = data?.times?.[String(theme.themePK)]
    if (!Array.isArray(times)) return []
    return times
      .filter(slot => slot.reservation === false)
      .map(slot => slot.time.slice(0, 5))  // "HH:MM:SS" → "HH:MM"
      .filter(time => isFutureSlot(dateStr, time))
      .sort()
  } catch {
    return []
  }
}

export async function fetchZerohongdaeThemeSlots(themeId, skipDows = new Set()) {
  const theme = ZEROHONGDAE_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown zerohongdae theme: ${themeId}`)

  const dates = filterSkipDays(getDateRange(RANGE_DAYS), skipDows)
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllZerohongdaeSlots() {
  const results = await Promise.all(
    ZEROHONGDAE_THEMES.map(async (theme) => {
      const slots = await fetchZerohongdaeThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
