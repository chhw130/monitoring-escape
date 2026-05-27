/**
 * GitHub Actions에서 실행 — Vercel IP 봇 차단 우회용
 * roomlescape.com을 직접 스크래핑해서 ROOMLESCAPE_SLOTS Variable에 저장
 */

const BASE_URL   = 'https://www.roomlescape.com'
const UA         = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const GH_PAT     = process.env.GH_PAT
const GH_REPO    = process.env.GITHUB_REPOSITORY
const RANGE_DAYS = 7

const THEMES = [
  { id: 'roomlescape-hongdae1-commute', themeSeq: 6, openDaysAhead: 6, openHour: 0, openMinute: 0 },
]

function getDateRange(days) {
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function isBookable(dateStr, openDaysAhead, openHour, openMinute = 0) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const slotDate = new Date(Date.UTC(year, month - 1, day))
  const openTime = new Date(slotDate)
  openTime.setUTCDate(openTime.getUTCDate() - openDaysAhead)
  openTime.setUTCHours(openHour - 9, openMinute, 0, 0)
  return Date.now() >= openTime.getTime()
}

async function fetchAvailableTimesForDate(themeSeq, dateStr) {
  try {
    const res = await fetch(`${BASE_URL}/rev.theme.time.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': UA,
        'Origin': BASE_URL,
        'Referer': `${BASE_URL}/home.php?go=rev.make`,
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': 'isAnimation=true; popup_14=true',
      },
      body: `themeSeq=${themeSeq}&reservationDate=${dateStr}`,
    })
    const html = await res.text()
    if (html.includes('조회할 수 없는 날')) return []
    if (html.includes('cupid.js')) {
      console.warn(`[roomlescape] ${dateStr}: cupid.js 봇 차단 감지 — GitHub Actions IP도 차단됨`)
      return []
    }

    const times = []
    const regex = /<li class='possible'[^>]*>(\d{2}:\d{2})<\/li>/g
    let match
    while ((match = regex.exec(html)) !== null) { times.push(match[1]) }
    return times.sort()
  } catch (e) {
    console.error(`[roomlescape] ${dateStr} fetch 실패:`, e.message)
    return []
  }
}

async function updateGitHubVariable(name, value) {
  const API_BASE = `https://api.github.com/repos/${GH_REPO}/actions/variables`
  const headers  = {
    Authorization: `Bearer ${GH_PAT}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
  const patchRes = await fetch(`${API_BASE}/${name}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ name, value: String(value) }),
  })
  if (patchRes.status === 404) {
    await fetch(API_BASE, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, value: String(value) }),
    })
  }
}

// 각 테마별 슬롯 조회
const result = {}
for (const theme of THEMES) {
  const dates = getDateRange(RANGE_DAYS)
    .filter(d => isBookable(d, theme.openDaysAhead, theme.openHour, theme.openMinute))

  const slots = {}
  await Promise.all(
    dates.map(async (dateStr) => {
      const times = await fetchAvailableTimesForDate(theme.themeSeq, dateStr)
      if (times.length > 0) slots[dateStr] = times
    })
  )

  result[theme.id] = slots
  console.log(`[roomlescape] ${theme.id}:`, JSON.stringify(slots))
}

await updateGitHubVariable('ROOMLESCAPE_SLOTS', JSON.stringify(result))
console.log('✅ ROOMLESCAPE_SLOTS Variable 업데이트 완료')
