import https from 'node:https'

// thefrank.co.kr 서버가 TLS 중간 인증서를 전송하지 않아 Node.js fetch가 실패함.
// node:https 모듈로 해당 도메인에만 rejectUnauthorized: false 적용.
const HOSTNAME = 'thefrank.co.kr'
const AJAX_PATH = '/core/res/rev.make.ajax.php'
const BASE_URL  = `https://${HOSTNAME}`
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const FRANK_BRANCHES = [
  { id: 'frank', name: '프랭크의 골동품가게', brand: '프랭크', location: '강남' },
]

export const FRANK_THEMES = [
  {
    id: 'frank-5', name: 'My Private Heaven', emoji: '🏠',
    branchId: 'frank', branch: '프랭크의 골동품가게',
    themeNum: 5,
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

// 달력 API에서 실제 예약 가능한 날짜 목록 조회
// act=time은 예약 오픈 전 날짜도 가능으로 반환하므로 달력 기준으로 필터링
async function getBookableDates() {
  const today = new Date()
  const months = new Set([
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
  ])
  // doing(14일) 범위가 다음 달에 걸칠 수 있으므로 다음 달도 조회
  const next = new Date(today)
  next.setDate(today.getDate() + 14)
  months.add(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`)

  const dates = new Set()
  await Promise.all([...months].map(async (monthDate) => {
    try {
      const html = await ajaxPost(`act=calendar&rev_days=${monthDate}`)
      const regex = /fun_days_select\('(\d{4}-\d{2}-\d{2})'/g
      let m
      while ((m = regex.exec(html)) !== null) dates.add(m[1])
    } catch { /* 달력 조회 실패 시 해당 월 건너뜀 */ }
  }))
  return dates
}

// "21시 00분" → "21:00"
function parseKoreanTime(text) {
  const m = text.match(/(\d+)시\s+(\d+)분/)
  if (!m) return null
  return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`
}

function ajaxPost(body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: HOSTNAME,
      path: AJAX_PATH,
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': UA,
        'Referer': `${BASE_URL}/layout/res/home.php?go=rev.make`,
        'X-Requested-With': 'XMLHttpRequest',
      },
    }, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(chunks.join('')))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function getSlotsForDate(theme, dateStr) {
  try {
    const html = await ajaxPost(`act=time&rev_days=${dateStr}&theme_num=${theme.themeNum}`)
    const times = []
    const anchorRegex = /<a([^>]*)>([\s\S]*?)<\/a>/g
    let match
    while ((match = anchorRegex.exec(html)) !== null) {
      if (!match[1].includes('fun_theme_time_select')) continue
      const time = parseKoreanTime(match[2])
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

  const bookableDates = await getBookableDates()
  const results = await Promise.all(
    [...bookableDates].map(async (dateStr) => [dateStr, await getSlotsForDate(theme, dateStr)])
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
