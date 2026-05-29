import { isBookable, getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const GRAPHQL_URL = 'https://m.booking.naver.com/graphql?opName=hourlySchedule'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const BUSINESS_ID = '843881'
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

export const DREAMESCAPE_BRANCHES = [
  { id: 'dreamescape', name: '드림이스케이프', brand: '드림이스케이프', location: '건대' },
]

export const DREAMESCAPE_THEMES = [
  {
    id: 'dream-summer', name: '바야흐로, 여름이었다', emoji: '☀️',
    branchId: 'dreamescape', branch: '드림이스케이프',
    businessId: BUSINESS_ID, bizItemId: '6627331',
    openDaysAhead: 60, openHour: 0,
    reserveUrl: 'https://m.booking.naver.com/booking/12/bizes/843881/items/6627331',
  },
  {
    id: 'dream-allthebox', name: 'ALLTHEBOX PARADISE', emoji: '📦',
    branchId: 'dreamescape', branch: '드림이스케이프',
    businessId: BUSINESS_ID, bizItemId: '5294116',
    openDaysAhead: 60, openHour: 0,
    reserveUrl: 'https://m.booking.naver.com/booking/12/bizes/843881/items/5294116',
  },
  {
    id: 'dream-vet', name: 'V.E.T.', emoji: '🏥',
    branchId: 'dreamescape', branch: '드림이스케이프',
    businessId: BUSINESS_ID, bizItemId: '4863229',
    openDaysAhead: 60, openHour: 0,
    reserveUrl: 'https://m.booking.naver.com/booking/12/bizes/843881/items/4863229',
  },
  {
    id: 'dream-dolphin', name: 'Dolphin', emoji: '🐬',
    branchId: 'dreamescape', branch: '드림이스케이프',
    businessId: BUSINESS_ID, bizItemId: '4977602',
    openDaysAhead: 60, openHour: 0,
    reserveUrl: 'https://m.booking.naver.com/booking/12/bizes/843881/items/4977602',
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

export async function fetchDreamescapeThemeSlots(themeId, skipDows = new Set()) {
  const theme = DREAMESCAPE_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown dreamescape theme: ${themeId}`)

  const dates = filterSkipDays(
    getDateRange(RANGE_DAYS).filter(d => isBookable(d, theme.openDaysAhead, theme.openHour)),
    skipDows
  )
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllDreamescapeSlots() {
  const results = await Promise.all(
    DREAMESCAPE_THEMES.map(async (theme) => {
      const slots = await fetchDreamescapeThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
