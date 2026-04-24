const BASE_URL = 'https://play33.kr'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const RANGE_DAYS = 7  // reservation_range_day (site config)

export const PLAY33_BRANCHES = [
  { id: 'play33-konkuk',  name: '건대점', brand: 'play33', location: '건대' },
  { id: 'play33-hongdae', name: '홍대점', brand: 'play33', location: '홍대' },
]

export const PLAY33_THEMES = [
  {
    id: 'play33-dial', name: '다이얼', emoji: '☎️',
    branchId: 'play33-konkuk', branch: '건대점',
    branchNum: 1, themeNum: 19,
    openDaysAhead: 7, openHour: 20,
    reserveUrl: `${BASE_URL}/reservation?branch=1&theme=19`,
  },
  {
    id: 'play33-witness', name: '목격자', emoji: '👁️',
    branchId: 'play33-konkuk', branch: '건대점',
    branchNum: 1, themeNum: 20,
    openDaysAhead: 7, openHour: 20,
    reserveUrl: `${BASE_URL}/reservation?branch=1&theme=20`,
  },
  {
    id: 'play33-thatday', name: '그 날', emoji: '🗓️',
    branchId: 'play33-konkuk', branch: '건대점',
    branchNum: 1, themeNum: 21,
    openDaysAhead: 7, openHour: 20,
    reserveUrl: `${BASE_URL}/reservation?branch=1&theme=21`,
  },
  {
    id: 'play33-pian', name: '피안화', emoji: '🌸',
    branchId: 'play33-hongdae', branch: '홍대점',
    branchNum: 4, themeNum: 26,
    openDaysAhead: 7, openHour: 20,
    reserveUrl: `${BASE_URL}/reservation?branch=4&theme=26`,
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
    const buttonRegex = /<button class="eveReservationButton"[^>]*>[\s\S]*?<span>(\d{2}:\d{2})<\/span>/g
    let match
    while ((match = buttonRegex.exec(html)) !== null) {
      times.push(match[1])
    }
    return times.sort()
  } catch {
    return []
  }
}

export async function fetchPlay33ThemeSlots(themeId, skipDows = new Set()) {
  const theme = PLAY33_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown play33 theme: ${themeId}`)

  const dates = getDateRange()
    .filter(d => isBookable(d, theme.openDaysAhead, theme.openHour))
    .filter(d => !skipDows.has(new Date(d + 'T00:00:00').getDay()))
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await getSlotsForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllPlay33Slots() {
  const results = await Promise.all(
    PLAY33_THEMES.map(async (theme) => {
      const slots = await fetchPlay33ThemeSlots(theme.id)
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
