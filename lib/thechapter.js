import { isBookable, getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const GRAPHQL_URL = 'https://m.booking.naver.com/graphql?opName=hourlySchedule'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const RANGE_DAYS = 8

const HOURLY_QUERY = `query hourlySchedule($scheduleParams: ScheduleParams) {
  schedule(input: $scheduleParams) {
    bizItemSchedule {
      hourly {
        unitStartTime
        unitStock
        isUnitSaleDay
        __typename
      }
      __typename
    }
    __typename
  }
}`

export const THECHAPTER_BRANCHES = [
  { id: 'thechapter-hongdae', name: '홍대점', brand: '더 챕터', location: '홍대' },
]

export const THECHAPTER_THEMES = [
  {
    id: 'thechapter-select', name: '선택', emoji: '🎯',
    branchId: 'thechapter-hongdae', branch: '홍대점',
    businessId: '1473904', bizItemId: '6973906',
    openDaysAhead: 7, openHour: 0,
    reserveUrl: 'https://m.booking.naver.com/booking/12/bizes/1473904/items/6973906',
  },
]

async function fetchAvailableTimesForDate(theme, dateStr) {
  try {
    const startDateTime = `${dateStr}T00:00:00+09:00`
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': 'https://m.booking.naver.com',
        'user-agent': UA,
      },
      body: JSON.stringify({
        operationName: 'hourlySchedule',
        variables: {
          scheduleParams: {
            businessId: theme.businessId,
            businessTypeId: 12,
            bizItemId: theme.bizItemId,
            startDateTime,
            endDateTime: startDateTime,
          },
        },
        query: HOURLY_QUERY,
      }),
    })
    const data = await res.json()
    const hourly = data?.data?.schedule?.bizItemSchedule?.hourly
    if (!Array.isArray(hourly)) return []
    return hourly
      .filter(slot => slot.isUnitSaleDay && slot.unitStock > 0)
      .map(slot => slot.unitStartTime.slice(11, 16))
      .sort()
  } catch {
    return []
  }
}

export async function fetchTheChapterThemeSlots(themeId, skipDows = new Set()) {
  const theme = THECHAPTER_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown thechapter theme: ${themeId}`)

  const dates = filterSkipDays(
    getDateRange(RANGE_DAYS).filter(d => isBookable(d, theme.openDaysAhead, theme.openHour)),
    skipDows
  )
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllTheChapterSlots() {
  const results = await Promise.all(
    THECHAPTER_THEMES.map(async (theme) => {
      const slots = await fetchTheChapterThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
