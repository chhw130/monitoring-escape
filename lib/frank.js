const BASE_URL = 'https://thefrank.co.kr'
const AJAX_URL = `${BASE_URL}/core/res/rev.make.ajax.php`
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const FRANK_BRANCHES = [
  { id: 'frank', name: '프랭크의 골동품가게', brand: '프랭크', location: '강남' },
]

export const FRANK_THEMES = [
  {
    id: 'frank-5', name: 'My Private Heaven', emoji: '🏠',
    branchId: 'frank', branch: '프랭크의 골동품가게',
    themeNum: 5, doing: 14,
    openDaysAhead: null, openHour: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&theme_num=5`,
  },
  {
    id: 'frank-6', name: 'Brooklyn My Love', emoji: '🌆',
    branchId: 'frank', branch: '프랭크의 골동품가게',
    themeNum: 6, doing: 14,
    openDaysAhead: null, openHour: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&theme_num=6`,
  },
  {
    id: 'frank-7', name: 'Plan to save my dear', emoji: '🎒',
    branchId: 'frank', branch: '프랭크의 골동품가게',
    themeNum: 7, doing: 14,
    openDaysAhead: null, openHour: null,
    reserveUrl: `${BASE_URL}/layout/res/home.php?go=rev.make&theme_num=7`,
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

// "21시 00분" → "21:00"
function parseKoreanTime(text) {
  const m = text.match(/(\d+)시\s+(\d+)분/)
  if (!m) return null
  return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`
}

async function getSlotsForDate(theme, dateStr) {
  try {
    const res = await fetch(AJAX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        'Referer': `${BASE_URL}/layout/res/home.php?go=rev.make`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: `act=time&rev_days=${dateStr}&theme_num=${theme.themeNum}`,
    })
    if (!res.ok) return []
    const html = await res.text()

    const times = []
    // <a href="javascript:fun_theme_time_select(...)">...</a> → 예약 가능
    // 각 <a> 블록에서 href와 시간 텍스트를 함께 추출
    const anchorRegex = /<a([^>]*)>([\s\S]*?)<\/a>/g
    let match
    while ((match = anchorRegex.exec(html)) !== null) {
      const attrs = match[1]
      const inner = match[2]
      if (!attrs.includes('fun_theme_time_select')) continue
      const time = parseKoreanTime(inner)
      if (time) times.push(time)
    }
    return times.sort()
  } catch {
    return []
  }
}

export async function fetchFrankThemeSlots(themeId) {
  const theme = FRANK_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown frank theme: ${themeId}`)

  const dates = getDateRange(theme.doing)
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await getSlotsForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllFrankSlots() {
  const results = await Promise.all(
    FRANK_THEMES.map(async (theme) => {
      const slots = await fetchFrankThemeSlots(theme.id)
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
