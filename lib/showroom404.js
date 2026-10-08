import { getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const BASE_URL    = 'https://showroom404.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const RANGE_DAYS  = 14 // 오늘 날짜 기준 2주일 치 예약 오픈
const LOCATION_ID = 15 // 홍대점

export const SHOWROOM404_BRANCHES = [
  { id: 'showroom404-hongdae', name: '홍대점', brand: '쇼룸404', location: '홍대' },
]

export const SHOWROOM404_THEMES = [
  {
    id: 'showroom404-hongdae-pig', name: 'PIG', emoji: '🐷',
    branchId: 'showroom404-hongdae', branch: '홍대점',
    themeApiId: 653,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `${BASE_URL}/booking/`,
  },
]

function isFutureSlot(dateStr, timeStr) {
  return new Date() < new Date(`${dateStr}T${timeStr}:00+09:00`)
}

// 예약 오픈 기간이 아닌 날짜는 시간표 자체가 렌더링되지 않으므로 빈 배열로 처리됨
function parseAvailableTimes(html) {
  return [...html.matchAll(/<a [^>]*class="submit"[^>]*data-time="(\d{2}:\d{2})"/g)].map(m => m[1])
}

async function fetchAvailableTimesForDate(theme, dateStr) {
  try {
    const body = new URLSearchParams({
      action: 'filter_rooms',
      location_id: String(LOCATION_ID),
      theme_id: String(theme.themeApiId),
      currentDate: dateStr,
    })
    const res = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${BASE_URL}/booking/`,
      },
      body: body.toString(),
    })
    if (!res.ok) return []

    return parseAvailableTimes(await res.text())
      .filter(time => isFutureSlot(dateStr, time))
      .sort()
  } catch {
    return []
  }
}

export async function fetchShowroom404ThemeSlots(themeId, skipDows = new Set()) {
  const theme = SHOWROOM404_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown showroom404 theme: ${themeId}`)

  const dates = filterSkipDays(getDateRange(RANGE_DAYS), skipDows)
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllShowroom404Slots() {
  const results = await Promise.all(
    SHOWROOM404_THEMES.map(async (theme) => {
      const slots = await fetchShowroom404ThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
