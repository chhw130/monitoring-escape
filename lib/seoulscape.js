import { isBookable, getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const BASE_URL = 'https://www.seoul-escape.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const RANGE_DAYS = 15

export const SEOULSCAPE_BRANCHES = [
  { id: 'seoulscape-hongdae', name: '홍대점', brand: '서울이스케이프룸', location: '홍대' },
]

export const SEOULSCAPE_THEMES = [
  {
    id: 'seoulscape-osiris', name: '오시리스', emoji: '🏺',
    branchId: 'seoulscape-hongdae', branch: '홍대점',
    branchNum: 1, themeNum: 48,
    openDaysAhead: 14, openHour: 20,
    reserveUrl: `${BASE_URL}/reservation?branch=1&theme=48`,
  },
]

async function fetchAvailableTimesForDate(theme, dateStr) {
  try {
    const url = `${BASE_URL}/reservation?branch=${theme.branchNum}&theme=${theme.themeNum}&date=${dateStr}`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const html = await res.text()

    const times = []
    const buttonRegex = /<button class="active1 eveReservationButton[^"]*"[^>]*>[\s\S]*?<span class="ff-bhs">(\d{2}:\d{2})<\/span>/g
    let match
    while ((match = buttonRegex.exec(html)) !== null) { times.push(match[1]) }
    return times.sort()
  } catch {
    return []
  }
}

export async function fetchSeoulscapeThemeSlots(themeId, skipDows = new Set()) {
  const theme = SEOULSCAPE_THEMES.find(t => t.id === themeId)
  if (!theme) { throw new Error(`Unknown seoulscape theme: ${themeId}`) }

  const dates = filterSkipDays(
    getDateRange(RANGE_DAYS).filter(d => isBookable(d, theme.openDaysAhead, theme.openHour)),
    skipDows
  )
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllSeoulscapeSlots() {
  const results = await Promise.all(
    SEOULSCAPE_THEMES.map(async (theme) => {
      const slots = await fetchSeoulscapeThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
