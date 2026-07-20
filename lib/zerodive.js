import { getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const BASE_URL   = 'https://zeroworldkorea.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const RANGE_DAYS = 14
const ZIZUM_NUM  = 2   // 제로월드 다이브 건대점
const SUBJ       = 'B' // 다이브 예약 구분

export const ZERODIVE_BRANCHES = [
  { id: 'zerodive', name: '다이브 건대점', brand: '제로월드', location: '건대' },
]

// 인터뷰는 2026-07-30 시간표 개편으로 테마 번호가 나뉘어 있어 날짜별로 선택한다.
export const ZERODIVE_THEMES = [
  {
    id: 'zerodive-interview', name: '인터뷰', emoji: '🎙️',
    branchId: 'zerodive', branch: '다이브 건대점',
    schedules: [
      { themePK: 3, to: '2026-07-29' },
      { themePK: 39, from: '2026-07-30' },
    ],
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}`,
  },
  {
    id: 'zerodive-orgel', name: '오르골', emoji: '🎵',
    branchId: 'zerodive', branch: '다이브 건대점',
    schedules: [
      { themePK: 38 },
    ],
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}`,
  },
]

function themePKForDate(theme, dateStr) {
  const schedule = theme.schedules.find(
    s => (!s.from || s.from <= dateStr) && (!s.to || dateStr <= s.to)
  )
  return schedule?.themePK ?? null
}

async function callApi(body) {
  const res = await fetch(`${BASE_URL}/core/res/rev.make.sel.php`, {
    method: 'POST',
    headers: {
      'Accept': 'text/html, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}`,
      'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  })
  if (!res.ok) throw new Error(`zerodive API 실패: ${res.status}`)
  return res.text()
}

// 월별 달력 캐시 — 예약 오픈된 날짜만 선택 가능하므로 달력으로 오픈 기간을 판별
const _calendarCache = new Map()
function getOpenDatesOfMonth(year, month) {
  const key = `${year}-${month}`
  if (!_calendarCache.has(key)) {
    _calendarCache.set(key, _fetchOpenDatesOfMonth(year, month).finally(() => _calendarCache.delete(key)))
  }
  return _calendarCache.get(key)
}

async function _fetchOpenDatesOfMonth(year, month) {
  const html = await callApi(
    `act=calendar&zizum_num=${ZIZUM_NUM}&rev_days=&year=${year}&month=${month}&s_subj=${SUBJ}`
  )
  return new Set([...html.matchAll(/fun_days_select\('(\d{4}-\d{2}-\d{2})'/g)].map(m => m[1]))
}

async function filterOpenDates(dates) {
  const months = [...new Set(dates.map(d => d.slice(0, 7)))]
  const openSets = await Promise.all(
    months.map(ym => getOpenDatesOfMonth(Number(ym.slice(0, 4)), Number(ym.slice(5, 7))))
  )
  const openDates = new Set(openSets.flatMap(s => [...s]))
  return dates.filter(d => openDates.has(d))
}

function isFutureSlot(dateStr, timeStr) {
  return new Date() < new Date(`${dateStr}T${timeStr}:00+09:00`)
}

async function fetchAvailableTimesForDate(theme, dateStr) {
  const themePK = themePKForDate(theme, dateStr)
  if (themePK === null) return []
  try {
    const html = await callApi(
      `act=theme_time_list&zizum_num=${ZIZUM_NUM}&rev_days=${dateStr}&theme_num=${themePK}`
    )
    // 예약 가능 슬롯만 fun_theme_time_select 링크를 가진다 (마감은 disable 클래스)
    return [...html.matchAll(/<a class="choice-time__time"\s+href="javascript:fun_theme_time_select[^>]*>(\d{2}:\d{2})<\/a>/g)]
      .map(m => m[1])
      .filter(time => isFutureSlot(dateStr, time))
      .sort()
  } catch {
    return []
  }
}

export async function fetchZerodiveThemeSlots(themeId, skipDows = new Set()) {
  const theme = ZERODIVE_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown zerodive theme: ${themeId}`)

  const weekdayDateSet = new Set(getDateRange(7))
  const candidates = filterSkipDays(getDateRange(RANGE_DAYS), skipDows).filter(dateStr => {
    const dow = new Date(dateStr + 'T00:00:00').getDay()
    const isWeekday = dow !== 0 && dow !== 6
    return !isWeekday || weekdayDateSet.has(dateStr)
  })
  const dates = await filterOpenDates(candidates)
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllZerodiveSlots() {
  const results = await Promise.all(
    ZERODIVE_THEMES.map(async (theme) => {
      const slots = await fetchZerodiveThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
