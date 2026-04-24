const BASE_URL = 'https://oasismuseum.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

export const OASIS_BRANCHES = [
  { id: 'oasis-hongdae', name: '홍대점', brand: '오아시스뮤지엄', location: '홍대' },
]

// 6일 전 자정 00:00 KST에 예약 오픈
export const OASIS_THEMES = [
  {
    id: 'oasis-1', name: '업사이드 다운', emoji: '🙃',
    branchId: 'oasis-hongdae', branch: '홍대점',
    themeNum: 1, doing: 7,
    openDaysAhead: 6, openHour: 0,
    reserveUrl: 'https://oasismuseum.com/ticket?id=1',
  },
  {
    id: 'oasis-5', name: '미씽 삭스 미스터리', emoji: '🧦',
    branchId: 'oasis-hongdae', branch: '홍대점',
    themeNum: 5, doing: 7,
    openDaysAhead: 6, openHour: 0,
    reserveUrl: 'https://oasismuseum.com/ticket?id=5',
  },
  {
    id: 'oasis-6', name: '배드 타임', emoji: '😈',
    branchId: 'oasis-hongdae', branch: '홍대점',
    themeNum: 6, doing: 7,
    openDaysAhead: 6, openHour: 0,
    reserveUrl: 'https://oasismuseum.com/ticket?id=6',
  },
  {
    id: 'oasis-8', name: '하이 맥스', emoji: '🏆',
    branchId: 'oasis-hongdae', branch: '홍대점',
    themeNum: 8, doing: 7,
    openDaysAhead: 6, openHour: 0,
    reserveUrl: 'https://oasismuseum.com/ticket?id=8',
  },
]

function getDateRange(doing) {
  const dates = []
  const today = new Date()
  for (let i = 0; i < doing; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

async function getSlotsForDate(theme, dateStr) {
  const pageRes = await fetch(`${BASE_URL}/ticket?date=${dateStr}&id=${theme.themeNum}`, {
    headers: { 'User-Agent': UA },
  })
  if (!pageRes.ok) return []

  const html = await pageRes.text()
  if (html.includes('예약할 수 없는 날짜')) return []

  // data-time="HH:MM" ... value="slotId" 파싱
  const slotMap = {}
  const regex = /data-time="(\d{2}:\d{2})"[^>]*value="(\d+)"/g
  let match
  while ((match = regex.exec(html)) !== null) {
    slotMap[match[2]] = match[1] // slotId → time
  }
  if (Object.keys(slotMap).length === 0) return []

  // 예약 불가 slot ID 조회
  const schedRes = await fetch(`${BASE_URL}/ticket/getSchedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
    },
    body: `tm=${theme.themeNum}&date=${dateStr}`,
  })

  let unavailable = []
  if (schedRes.ok) {
    const data = await schedRes.json()
    if (Array.isArray(data)) unavailable = data
  }

  // 예약 가능 = 전체 - 불가
  return Object.entries(slotMap)
    .filter(([slotId]) => !unavailable.includes(slotId))
    .map(([, time]) => time)
    .sort()
}

export async function fetchOasisThemeSlots(themeId, skipDows = new Set()) {
  const theme = OASIS_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown oasis theme: ${themeId}`)

  const dates = getDateRange(theme.doing).filter(d => !skipDows.has(new Date(d + 'T00:00:00').getDay()))
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await getSlotsForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllOasisSlots() {
  const results = await Promise.all(
    OASIS_THEMES.map(async (theme) => {
      const slots = await fetchOasisThemeSlots(theme.id)
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
