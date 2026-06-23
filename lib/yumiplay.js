import { isBookable, getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const GRAPHQL_URL = 'https://m.booking.naver.com/graphql?opName=hourlySchedule'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const BUSINESS_ID = '1661745'
const RANGE_DAYS = 17

const HOURLY_QUERY = `query hourlySchedule($scheduleParams: ScheduleParams) {
  schedule(input: $scheduleParams) {
    bizItemSchedule {
      hourly {
        unitStartTime
        unitStock
        unitBookingCount
        isUnitSaleDay
        __typename
      }
      __typename
    }
    __typename
  }
}`

export const YUMIPLAY_BRANCHES = [
  { id: 'yumiplay-hongdae', name: '유미플레이 홍대점', brand: '유미플레이', location: '홍대' },
]

export const YUMIPLAY_THEMES = [
  {
    id: 'yumiplay-insane', name: '인세인 / INSANE', emoji: '🌀',
    branchId: 'yumiplay-hongdae', branch: '유미플레이 홍대점',
    businessId: BUSINESS_ID, bizItemId: '7713929',
    openDaysAhead: 16, openHour: 0,
    reserveUrl: 'https://m.booking.naver.com/booking/12/bizes/1661745/items/7713929',
  },
]

function isFutureSlot(dateStr, timeStr) {
  return new Date() < new Date(`${dateStr}T${timeStr}:00+09:00`)
}

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
      .filter(slot => slot.isUnitSaleDay && slot.unitStock > slot.unitBookingCount)
      .map(slot => slot.unitStartTime.slice(11, 16))
      .filter(time => isFutureSlot(dateStr, time))
      .sort()
  } catch {
    return []
  }
}

export async function fetchYumiplayThemeSlots(themeId, skipDows = new Set()) {
  const theme = YUMIPLAY_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown yumiplay theme: ${themeId}`)

  const dates = filterSkipDays(
    getDateRange(RANGE_DAYS).filter(d => isBookable(d, theme.openDaysAhead, theme.openHour)),
    skipDows
  )
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllYumiplaySlots() {
  const results = await Promise.all(
    YUMIPLAY_THEMES.map(async (theme) => {
      const slots = await fetchYumiplayThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
