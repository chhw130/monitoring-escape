const BASE_URL = 'https://showroom404.com'
const AJAX_URL = `${BASE_URL}/wp-admin/admin-ajax.php`
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
const RANGE_DAYS = 15  // 오늘 포함 14일 뒤까지

export const SHOWROOM_BRANCHES = [
  { id: 'showroom404-hongdae', name: '홍대점', brand: '쇼룸 404', location: '홍대' },
]

export const SHOWROOM_THEMES = [
  {
    id: 'showroom404-pig', name: 'PIG', emoji: '🐷',
    branchId: 'showroom404-hongdae', branch: '홍대점',
    themeNum: 653,
    openDaysAhead: 14, openHour: 0,  // 2주 전 자정 KST 예약 오픈
    reserveUrl: `${BASE_URL}/booking/`,
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
    const body = `action=filter_rooms&location_id=&theme_id=${theme.themeNum}&currentDate=${dateStr}`
    const res = await fetch(AJAX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': BASE_URL,
        'Referer': `${BASE_URL}/booking/`,
        'User-Agent': UA,
      },
      body,
    })
    const html = await res.text()

    const times = []
    const anchorRegex = /<a[^>]+>/g
    let match
    while ((match = anchorRegex.exec(html)) !== null) {
      const tag = match[0]
      if (!tag.includes('class="submit"')) continue
      const timeMatch = tag.match(/data-time="(\d{2}:\d{2})"/)
      if (timeMatch) times.push(timeMatch[1])
    }
    return times.sort()
  } catch {
    return []
  }
}

export async function fetchShowroomThemeSlots(themeId, skipDows = new Set()) {
  const theme = SHOWROOM_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown showroom theme: ${themeId}`)

  const dates = getDateRange()
    .filter(d => isBookable(d, theme.openDaysAhead, theme.openHour))
    .filter(d => !skipDows.has(new Date(d + 'T00:00:00').getDay()))
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await getSlotsForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllShowroomSlots() {
  const results = await Promise.all(
    SHOWROOM_THEMES.map(async (theme) => {
      const slots = await fetchShowroomThemeSlots(theme.id)
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
