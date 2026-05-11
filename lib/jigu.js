const BASE_URL = 'https://www.xn--2e0b040a4xj.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const RANGE_DAYS = 7  // 오늘 포함 7일치 예약 가능

export const JIGU_BRANCHES = [
  { id: 'jigu-hongdae-adventure', name: '홍대어드벤처점', brand: '지구별방탈출', location: '홍대' },
]

export const JIGU_THEMES = [
  {
    id: 'jigu-pinocchio', name: 'PINOCCHIO', emoji: '🤥',
    branchId: 'jigu-hongdae-adventure', branch: '홍대어드벤처점',
    branchNum: 2, themeNum: 25,
    openDaysAhead: 7, openHour: 22,  // 1주 전 22시 KST 예약 오픈
    reserveUrl: `${BASE_URL}/reservation?branch=2&theme=25`,
  },
]

function isBookable(dateStr, openDaysAhead, openHour) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const slotDate = new Date(Date.UTC(year, month - 1, day))
  const openTime = new Date(slotDate)
  openTime.setUTCDate(openTime.getUTCDate() - openDaysAhead)
  openTime.setUTCHours(openHour - 9, 0, 0, 0) // KST → UTC
  return Date.now() >= openTime.getTime()
}

function getDateRange() {
  const dates = []
  const today = new Date()
  for (let i = 0; i < RANGE_DAYS; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

async function getSlotsForDate(theme, dateStr) {
  try {
    const url = `${BASE_URL}/reservation?branch=${theme.branchNum}&theme=${theme.themeNum}&date=${dateStr}`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const html = await res.text()

    const times = []
    const buttonRegex = /<button class="active1 eveReservationButton[^"]*"[^>]*>[\s\S]*?<span class="ff-bhs">(\d{2}:\d{2})<\/span>/g
    let match
    while ((match = buttonRegex.exec(html)) !== null) {
      times.push(match[1])
    }
    return times.sort()
  } catch {
    return []
  }
}

export async function fetchJiguThemeSlots(themeId, skipDows = new Set()) {
  const theme = JIGU_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown jigu theme: ${themeId}`)

  const dates = getDateRange()
    .filter(d => isBookable(d, theme.openDaysAhead, theme.openHour))
    .filter(d => !skipDows.has(new Date(d + 'T00:00:00').getDay()))
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await getSlotsForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllJiguSlots() {
  const results = await Promise.all(
    JIGU_THEMES.map(async (theme) => {
      const slots = await fetchJiguThemeSlots(theme.id)
      return [theme.id, {
        slots,
        checked_at: new Date().toISOString(),
        name: theme.name,
        emoji: theme.emoji,
        branch: theme.branch,
        openDaysAhead: theme.openDaysAhead,
        openHour: theme.openHour,
        reserveUrl: theme.reserveUrl,
      }]
    })
  )
  return Object.fromEntries(results)
}
