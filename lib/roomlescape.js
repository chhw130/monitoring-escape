import { isBookable, getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const BASE_URL   = 'https://www.roomlescape.com'
const RANGE_DAYS = 7
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'

export const ROOMLESCAPE_BRANCHES = [
  { id: 'roomlescape-hongdae1', name: '홍대1호점', brand: '룸이스케이프', location: '홍대' },
]

export const ROOMLESCAPE_THEMES = [
  {
    id: 'roomlescape-hongdae1-commute', name: '퇴근길', emoji: '🚇',
    branchId: 'roomlescape-hongdae1', branch: '홍대1호점',
    themeSeq: 6,
    openDaysAhead: 6, openHour: 0, openMinute: 0,
    reserveUrl: `${BASE_URL}/home.php?go=rev.make&showroomSeq=2&themeSeq=6`,
  },
]

async function fetchAvailableTimesForDate(themeSeq, dateStr) {
  try {
    const res = await fetch(`${BASE_URL}/rev.theme.time.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': UA,
        'Origin': BASE_URL,
        'Referer': `${BASE_URL}/home.php?go=rev.make`,
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': 'isAnimation=true; popup_14=true',
      },
      body: `themeSeq=${themeSeq}&reservationDate=${dateStr}`,
    })
    const html = await res.text()
    if (html.includes('조회할 수 없는 날')) return []

    const times = []
    const regex = /<li class='possible'[^>]*>(\d{2}:\d{2})<\/li>/g
    let match
    while ((match = regex.exec(html)) !== null) { times.push(match[1]) }
    return times.sort()
  } catch {
    return []
  }
}

export async function fetchRoomlescapeThemeSlots(themeId, skipDows = new Set()) {
  const theme = ROOMLESCAPE_THEMES.find(t => t.id === themeId)
  if (!theme) { throw new Error(`Unknown roomlescape theme: ${themeId}`) }

  const dates = filterSkipDays(
    getDateRange(RANGE_DAYS).filter(d => isBookable(d, theme.openDaysAhead, theme.openHour, theme.openMinute)),
    skipDows
  )
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme.themeSeq, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllRoomlescapeSlots() {
  const results = await Promise.all(
    ROOMLESCAPE_THEMES.map(async (theme) => {
      const slots = await fetchRoomlescapeThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
