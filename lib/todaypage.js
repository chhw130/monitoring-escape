import { isBookable, getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const GRAPHQL_URL = 'https://m.booking.naver.com/graphql?opName=hourlySchedule'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const BUSINESS_ID = '1325520'
const RANGE_DAYS = 35

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

export const TODAYPAGE_BRANCHES = [
  { id: 'todaypage', name: '오늘의 한 페이지', brand: '오늘의 한 페이지', location: '강남' },
]

export const TODAYPAGE_THEMES = [
  {
    id: 'todaypage-buddy', name: '버디', emoji: '🐶',
    branchId: 'todaypage', branch: '오늘의 한 페이지',
    businessId: BUSINESS_ID, bizItemId: '6446475',
    openDaysAhead: 60, openHour: 0,
    reserveUrl: 'https://booking.naver.com/booking/12/bizes/1325520/items/6446475',
  },
  {
    id: 'todaypage-yongpaldoryeong', name: '용하다 용해!! 용팔도령', emoji: '🐉',
    branchId: 'todaypage', branch: '오늘의 한 페이지',
    businessId: BUSINESS_ID, bizItemId: '6738581',
    openDaysAhead: 60, openHour: 0,
    reserveUrl: 'https://booking.naver.com/booking/12/bizes/1325520/items/6738581',
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

export async function fetchTodaypageThemeSlots(themeId, skipDows = new Set()) {
  const theme = TODAYPAGE_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown todaypage theme: ${themeId}`)

  const dates = filterSkipDays(
    getDateRange(RANGE_DAYS).filter(d => isBookable(d, theme.openDaysAhead, theme.openHour)),
    skipDows
  )
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllTodaypageSlots() {
  const results = await Promise.all(
    TODAYPAGE_THEMES.map(async (theme) => {
      const slots = await fetchTodaypageThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
