import { getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const BASE_URL   = 'https://zeroworldkorea.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const RANGE_DAYS = 14
const ZIZUM_NUM  = 4   // 제로월드 강남점
const SUBJ       = 'A' // 강남점 예약 구분

export const ZEROGANGNAM_BRANCHES = [
  { id: 'zerogangnam', name: '강남점', brand: '제로월드', location: '강남' },
]

export const ZEROGANGNAM_THEMES = [
  {
    id: 'zerogangnam-ring', name: '링', emoji: '💍',
    branchId: 'zerogangnam', branch: '강남점',
    themePK: 32,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}&zizum_num=${ZIZUM_NUM}`,
  },
  {
    id: 'zerogangnam-butterfly', name: '나비효과', emoji: '🦋',
    branchId: 'zerogangnam', branch: '강남점',
    themePK: 31,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}&zizum_num=${ZIZUM_NUM}`,
  },
  {
    id: 'zerogangnam-caller', name: '콜러', emoji: '📞',
    branchId: 'zerogangnam', branch: '강남점',
    themePK: 30,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}&zizum_num=${ZIZUM_NUM}`,
  },
  {
    id: 'zerogangnam-winternight2', name: '어느겨울밤2', emoji: '❄️',
    branchId: 'zerogangnam', branch: '강남점',
    themePK: 29,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}&zizum_num=${ZIZUM_NUM}`,
  },
  {
    id: 'zerogangnam-iam', name: '아이엠', emoji: '🤖',
    branchId: 'zerogangnam', branch: '강남점',
    themePK: 28,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}&zizum_num=${ZIZUM_NUM}`,
  },
  {
    id: 'zerogangnam-zerohotelL', name: '제로호텔L', emoji: '🏨',
    branchId: 'zerogangnam', branch: '강남점',
    themePK: 27,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}&zizum_num=${ZIZUM_NUM}`,
  },
  {
    id: 'zerogangnam-done', name: 'DONE', emoji: '✅',
    branchId: 'zerogangnam', branch: '강남점',
    themePK: 26,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}&zizum_num=${ZIZUM_NUM}`,
  },
  {
    id: 'zerogangnam-forrest', name: '포레스트', emoji: '🌲',
    branchId: 'zerogangnam', branch: '강남점',
    themePK: 25,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}&zizum_num=${ZIZUM_NUM}`,
  },
  {
    id: 'zerogangnam-heol', name: '헐!', emoji: '😱',
    branchId: 'zerogangnam', branch: '강남점',
    themePK: 24,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}&zizum_num=${ZIZUM_NUM}`,
  },
]

async function callApi(body) {
  const res = await fetch(`${BASE_URL}/core/res/rev.make.sel.php`, {
    method: 'POST',
    headers: {
      'Accept': 'text/html, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/layout/res/home.php?go=rev.make&s_subj=${SUBJ}&zizum_num=${ZIZUM_NUM}`,
      'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  })
  if (!res.ok) throw new Error(`zerogangnam API 실패: ${res.status}`)
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
  try {
    const html = await callApi(
      `act=theme_time_list&zizum_num=${ZIZUM_NUM}&rev_days=${dateStr}&theme_num=${theme.themePK}`
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

export async function fetchZerogangnamThemeSlots(themeId, skipDows = new Set()) {
  const theme = ZEROGANGNAM_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown zerogangnam theme: ${themeId}`)

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

export async function fetchAllZerogangnamSlots() {
  const results = await Promise.all(
    ZEROGANGNAM_THEMES.map(async (theme) => {
      const slots = await fetchZerogangnamThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
