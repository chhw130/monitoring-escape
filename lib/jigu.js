import { isBookable, getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const BASE_URL = 'https://www.xn--2e0b040a4xj.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const RANGE_DAYS = 7

export const JIGU_BRANCHES = [
  { id: 'jigu-hongdae-adventure', name: '홍대어드벤처점', brand: '지구별방탈출', location: '홍대' },
]

export const JIGU_THEMES = [
  {
    id: 'jigu-pinocchio', name: 'PINOCCHIO', emoji: '🤥',
    branchId: 'jigu-hongdae-adventure', branch: '홍대어드벤처점',
    branchNum: 2, themeNum: 25,
    openDaysAhead: 7, openHour: 22,
    reserveUrl: `${BASE_URL}/reservation?branch=2&theme=25`,
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

export async function fetchJiguThemeSlots(themeId, skipDows = new Set()) {
  const theme = JIGU_THEMES.find(t => t.id === themeId)
  if (!theme) { throw new Error(`Unknown jigu theme: ${themeId}`) }

  const dates = filterSkipDays(
    getDateRange(RANGE_DAYS).filter(d => isBookable(d, theme.openDaysAhead, theme.openHour)),
    skipDows
  )
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllJiguSlots() {
  const results = await Promise.all(
    JIGU_THEMES.map(async (theme) => {
      const slots = await fetchJiguThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
