const BASE_URL = 'https://www.seoul-escape.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const RANGE_DAYS = 15  // 오늘 포함 14일 뒤까지 예약 가능

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

export async function fetchSeoulscapeThemeSlots(themeId, skipDows = new Set()) {
  const theme = SEOULSCAPE_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown seoulscape theme: ${themeId}`)

  const dates = getDateRange()
    .filter(d => isBookable(d, theme.openDaysAhead, theme.openHour))
    .filter(d => !skipDows.has(new Date(d + 'T00:00:00').getDay()))
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await getSlotsForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllSeoulscapeSlots() {
  const results = await Promise.all(
    SEOULSCAPE_THEMES.map(async (theme) => {
      const slots = await fetchSeoulscapeThemeSlots(theme.id)
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
