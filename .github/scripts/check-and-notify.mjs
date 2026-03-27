const SITE_URL       = process.env.SITE_URL
const DISCORD_URL    = process.env.DISCORD_WEBHOOK_URL
const NOTIFY_THEMES  = new Set((process.env.NOTIFY_THEMES || 'tutu,ayako,goerok').split(',').map(s => s.trim()))

const WEEKDAY_MIN = parseInt(process.env.NOTIFY_WEEKDAY_MIN ?? '17')
const WEEKEND_MIN = parseInt(process.env.NOTIFY_WEEKEND_MIN ?? '0')

function isTimeAllowed(dateStr, timeStr) {
  const dow = new Date(dateStr + 'T00:00:00').getDay() // 0=일, 6=토
  const isWeekend = dow === 0 || dow === 6
  const hour = parseInt(timeStr.split(':')[0])
  return hour >= (isWeekend ? WEEKEND_MIN : WEEKDAY_MIN)
}

// 슬롯 조회 (lib/keyescape.js에서 isBookable 필터 적용된 결과)
const res = await fetch(`${SITE_URL}/api/slots/all`)
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
    const filteredTimes = times.filter(t => isTimeAllowed(date, t))
    if (filteredTimes.length > 0) filtered[date] = filteredTimes
  }
  if (Object.keys(filtered).length > 0) available[themeId] = { ...themeData, slots: filtered }
}

if (Object.keys(available).length === 0) {
  console.log('예약 가능한 슬롯 없음')
  process.exit(0)
}

// Discord 메시지 생성
let message = '🔔 **키이스케이프 예약 가능!**\n\n'
for (const [, themeData] of Object.entries(available)) {
  const { name, emoji, branch, openDaysAhead, openHour, slots, reserveUrl } = themeData
  message += `**[${branch}] ${name} ${emoji}**`
  message += ` *(예약 오픈: ${openDaysAhead}일 전 오전 ${openHour}시)*\n`
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
