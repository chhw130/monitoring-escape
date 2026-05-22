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
        unitBookingCount
        isUnitSaleDay
        __typename
      }
      __typename
    }
    __typename
  }
}`

export const CHANNEL27_BRANCHES = [
  { id: 'channel27-butterfly', name: '버터플라이점', brand: '채널27', location: '홍대' },
]

export const CHANNEL27_THEMES = [
  {
    id: 'channel27-butterfly-sayona', name: '사요나, 세이코!', emoji: '🦋',
    branchId: 'channel27-butterfly', branch: '버터플라이점',
    businessId: '1498729', bizItemId: '7094790',
    openDaysAhead: 7, openHour: 0,
    reserveUrl: 'https://m.booking.naver.com/booking/12/bizes/1498729/items/7094790',
  },
  {
    id: 'channel27-butterfly-boomboom', name: '붐붐박사의 폭죽놀이 유토피아', emoji: '🎆',
    branchId: 'channel27-butterfly', branch: '버터플라이점',
    businessId: '1498729', bizItemId: '7193259',
    openDaysAhead: 7, openHour: 0,
    reserveUrl: 'https://m.booking.naver.com/booking/12/bizes/1498729/items/7193259',
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

export async function fetchChannel27ThemeSlots(themeId, skipDows = new Set()) {
  const theme = CHANNEL27_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown channel27 theme: ${themeId}`)

  const dates = filterSkipDays(
    getDateRange(RANGE_DAYS).filter(d => isBookable(d, theme.openDaysAhead, theme.openHour)),
    skipDows
  )
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllChannel27Slots() {
  const results = await Promise.all(
    CHANNEL27_THEMES.map(async (theme) => {
      const slots = await fetchChannel27ThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
