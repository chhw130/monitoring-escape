const SITE_URL      = process.env.SITE_URL
const DISCORD_URL   = process.env.DISCORD_WEBHOOK_URL
const NOTIFY_THEMES = new Set((process.env.NOTIFY_THEMES || 'tutu,ayako,goerok').split(',').map(s => s.trim()))

// 요일별 알림 시작 시간 (0=일 ~ 6=토), 기본: 주말 전체, 평일 17시 이후
const DAY_MIN = (process.env.NOTIFY_DAY_MIN || '0,17,17,17,17,17,0')
  .split(',').map(Number)

// 테마별 개별 설정 (없으면 글로벌 DAY_MIN 사용)
const THEME_SETTINGS = JSON.parse(process.env.NOTIFY_THEME_SETTINGS || '{}')

function isTimeAllowed(dateStr, timeStr, themeId) {
  const dow     = new Date(dateStr + 'T00:00:00').getDay()
  const hour    = parseInt(timeStr.split(':')[0])
  const dayMin  = THEME_SETTINGS[themeId]?.dayMin ?? DAY_MIN
  if (dayMin[dow] === -1) return false
  return hour >= dayMin[dow]
}

// 슬롯 조회 (없음 요일은 서버에서 fetch 자체를 건너뜀)
const params = new URLSearchParams({
  dayMin: process.env.NOTIFY_DAY_MIN || '0,17,17,17,17,17,0',
  themeSettings: process.env.NOTIFY_THEME_SETTINGS || '{}',
})
const res = await fetch(`${SITE_URL}/api/slots/all?${params}`)
if (!res.ok) {
  console.error('API 호출 실패:', res.status)
  process.exit(1)
}
const data = await res.json()

// 알림 시간대 필터링
const available = {}
for (const [themeId, themeData] of Object.entries(data).filter(([id]) => NOTIFY_THEMES.has(id))) {
  const filtered = {}
  for (const [date, times] of Object.entries(themeData.slots ?? {})) {
    const filteredTimes = times.filter(t => isTimeAllowed(date, t, themeId))
    if (filteredTimes.length > 0) filtered[date] = filteredTimes
  }
  if (Object.keys(filtered).length > 0) available[themeId] = { ...themeData, slots: filtered }
}

if (Object.keys(available).length === 0) {
  console.log('예약 가능한 슬롯 없음')
  process.exit(0)
}

// Discord 메시지 생성
let message = '🔔 **방탈출 예약 가능!**\n\n'
for (const [, themeData] of Object.entries(available)) {
  const { name, emoji, branch, openDaysAhead, openHour, slots, reserveUrl } = themeData
  const openInfo = (openDaysAhead != null && openHour != null)
    ? `${openDaysAhead}일 전 ${openHour}시`
    : '-'
  message += `**[${branch}] ${name} ${emoji}**`
  message += ` *(예약 오픈: ${openInfo})*\n`
  for (const [date, times] of Object.entries(slots)) {
    const d = new Date(date + 'T00:00:00')
    const label = `${d.getMonth() + 1}/${d.getDate()}(${['일','월','화','수','목','금','토'][d.getDay()]})`
    message += `  ${label}: ${times.join(', ')}\n`
  }
  message += `  → ${reserveUrl}\n\n`
}

// Discord 전송
const dcRes = await fetch(DISCORD_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: message }),
})
if (!dcRes.ok) {
  console.error('Discord 전송 실패:', dcRes.status, await dcRes.text())
  process.exit(1)
}
console.log('알림 전송 완료')
