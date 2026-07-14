import { isBookable, getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const BASE_URL = 'https://www.dpsnnn.com/booking/get_prod_list.cm'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const RANGE_DAYS = 6

export const DANPYUNSUN_BRANCHES = [
  { id: 'danpyunsun-gangnam', name: '단편선 강남', brand: '단편선', location: '강남' },
]

export const DANPYUNSUN_THEMES = [
  {
    id: 'danpyunsun-g-sangja', name: '상자', emoji: '📦',
    branchId: 'danpyunsun-gangnam', branch: '단편선 강남',
    itemPrefix: '상자',
    openDaysAhead: 6, openHour: 0,
    reserveUrl: 'https://www.dpsnnn.com/reserve_g',
  },
  {
    id: 'danpyunsun-g-haengbok', name: '행복', emoji: '😊',
    branchId: 'danpyunsun-gangnam', branch: '단편선 강남',
    itemPrefix: '행복',
    openDaysAhead: 6, openHour: 0,
    reserveUrl: 'https://www.dpsnnn.com/reserve_g',
  },
]

async function fetchAvailableTimesForDate(theme, dateStr) {
  try {
    const body = new URLSearchParams({ start_date: dateStr, end_date: dateStr })
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        'Referer': 'https://www.dpsnnn.com/reserve_g',
      },
      body: body.toString(),
    })
    const data = await res.json()
    if (data.msg !== 'SUCCESS') return []

    return data.available
      .filter(item => item.name.startsWith(theme.itemPrefix + ' / '))
      .map(item => item.name.split(' / ')[1])
      .filter(Boolean)
      .sort()
  } catch {
    return []
  }
}

export async function fetchDanpyunsunThemeSlots(themeId, skipDows = new Set()) {
  const theme = DANPYUNSUN_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown danpyunsun theme: ${themeId}`)

  const dates = filterSkipDays(
    getDateRange(RANGE_DAYS).filter(d => isBookable(d, theme.openDaysAhead, theme.openHour)),
    skipDows
  )
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllDanpyunsunSlots() {
  const results = await Promise.all(
    DANPYUNSUN_THEMES.map(async (theme) => {
      const slots = await fetchDanpyunsunThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
