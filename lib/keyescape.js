const BASE_URL = 'https://www.keyescape.com'
const PROC_URL = `${BASE_URL}/controller/run_proc.php`
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

export const THEMES = [
  { id: 'tutu',   name: '투투 어드벤처', emoji: '🗺️', zizumNum: '23', themeNum: '69', themeInfoNum: '60', doing: 7, reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=69&theme_info_num=60' },
  { id: 'ayako',  name: 'AYAKO',        emoji: '🎭', zizumNum: '23', themeNum: '71', themeInfoNum: '63', doing: 7, reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=71&theme_info_num=63' },
  { id: 'goerok', name: '괴록',          emoji: '👻', zizumNum: '23', themeNum: '70', themeInfoNum: '61', doing: 7, reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=70&theme_info_num=61' },
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

async function getSessionCookie(theme) {
  const url = `${BASE_URL}/reservation1.php?zizum_num=${theme.zizumNum}&theme_num=${theme.themeNum}&theme_info_num=${theme.themeInfoNum}`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  })
  return res.headers.get('set-cookie') ?? ''
}

async function getTimesForDate(cookie, theme, dateStr) {
  const body = new URLSearchParams({
    t: 'get_theme_time',
    date: dateStr,
    zizumNum: theme.zizumNum,
    themeNum: theme.themeNum,
    endDay: '0',
  })

  try {
    const res = await fetch(PROC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie,
        'Referer': `${BASE_URL}/reservation1.php?zizum_num=${theme.zizumNum}&theme_num=${theme.themeNum}&theme_info_num=${theme.themeInfoNum}`,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': UA,
      },
      body: body.toString(),
    })
    const data = await res.json()
    if (!data.status) return []
    return data.data
      .filter(item => item.enable === 'Y')
      .map(item => `${item.hh}:${item.mm}`)
  } catch {
    return []
  }
}

export async function fetchThemeSlots(themeId) {
  const theme = THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown theme: ${themeId}`)

  const [cookie, dates] = await Promise.all([
    getSessionCookie(theme),
    Promise.resolve(getDateRange(theme.doing)),
  ])

  // 모든 날짜 병렬 요청
  const results = await Promise.all(
    dates.map(async (dateStr) => {
      const times = await getTimesForDate(cookie, theme, dateStr)
      return [dateStr, times]
    })
  )

  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllSlots() {
  // 3개 테마 병렬 요청
  const results = await Promise.all(
    THEMES.map(async (theme) => {
      const slots = await fetchThemeSlots(theme.id)
      return [theme.id, { slots, checked_at: new Date().toISOString() }]
    })
  )
  return Object.fromEntries(results)
}
