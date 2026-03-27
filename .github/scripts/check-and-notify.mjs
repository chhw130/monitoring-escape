import { readFileSync, writeFileSync } from 'fs'

const SITE_URL      = process.env.SITE_URL
const DISCORD_URL   = process.env.DISCORD_WEBHOOK_URL
const CACHE_FILE    = process.env.CACHE_FILE || '/tmp/last-slots.json'

const WEEKDAY_MIN = parseInt(process.env.NOTIFY_WEEKDAY_MIN ?? '17')
const WEEKEND_MIN = parseInt(process.env.NOTIFY_WEEKEND_MIN ?? '0')

function isTimeAllowed(dateStr, timeStr) {
  const dow = new Date(dateStr + 'T00:00:00').getDay() // 0=일, 6=토
  const isWeekend = dow === 0 || dow === 6
  const hour = parseInt(timeStr.split(':')[0])
  return hour >= (isWeekend ? WEEKEND_MIN : WEEKDAY_MIN)
}

// 슬롯 날짜 기준 6일 전 오전 11시 KST(UTC+9 = UTC 02:00)에 예약 오픈
function isBookable(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const slotDate = new Date(Date.UTC(year, month - 1, day))
  const openTime = new Date(slotDate)
  openTime.setUTCDate(openTime.getUTCDate() - 6)
  openTime.setUTCHours(2, 0, 0, 0) // 11:00 KST
  return Date.now() >= openTime.getTime()
}

const THEME_NAMES = {
  tutu:   '투투 어드벤처 🗺️',
  ayako:  'AYAKO 🎭',
  goerok: '괴록 👻',
}

// 슬롯 조회
const res = await fetch(`${SITE_URL}/api/slots/all`)
if (!res.ok) {
  console.error('API 호출 실패:', res.status)
  process.exit(1)
}
const data = await res.json()

// 시간대 필터링
const available = {}
for (const [themeId, themeData] of Object.entries(data)) {
  const filtered = {}
  for (const [date, times] of Object.entries(themeData.slots ?? {})) {
    const filteredTimes = times.filter(t => isBookable(date) && isTimeAllowed(date, t))
    if (filteredTimes.length > 0) filtered[date] = filteredTimes
  }
  if (Object.keys(filtered).length > 0) available[themeId] = filtered
}

if (Object.keys(available).length === 0) {
  console.log('예약 가능한 슬롯 없음')
  process.exit(0)
}

// 이전 상태와 비교 (중복 알림 방지)
const currentHash = JSON.stringify(available)
let lastHash = ''
try {
  lastHash = readFileSync(CACHE_FILE, 'utf8')
} catch {}

if (currentHash === lastHash) {
  console.log('변경 없음, 알림 생략')
  process.exit(0)
}

// 현재 상태 저장
writeFileSync(CACHE_FILE, currentHash)

// Discord 메시지 생성
let message = '🔔 **키이스케이프 예약 가능!**\n\n'
for (const [themeId, slots] of Object.entries(available)) {
  message += `**${THEME_NAMES[themeId] ?? themeId}**\n`
  for (const [date, times] of Object.entries(slots)) {
    const d = new Date(date + 'T00:00:00')
    const label = `${d.getMonth() + 1}/${d.getDate()}(${['일','월','화','수','목','금','토'][d.getDay()]})`
    message += `  ${label}: ${times.join(', ')}\n`
  }
  message += '\n'
}
message += `→ 예약 페이지: ${SITE_URL}`

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
