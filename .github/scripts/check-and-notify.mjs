const SITE_URL = process.env.SITE_URL

const channels = [
  {
    webhook:       process.env.DISCORD_WEBHOOK_URL,
    themes:        new Set((process.env.NOTIFY_THEMES || '').split(',').map(s => s.trim()).filter(Boolean)),
    dayMin:        (process.env.NOTIFY_DAY_MIN || '0,17,17,17,17,17,0').split(',').map(Number),
    dayMax:        (process.env.NOTIFY_DAY_MAX || '24,24,24,24,24,24,24').split(',').map(Number),
    themeSettings: JSON.parse(process.env.NOTIFY_THEME_SETTINGS || '{}'),
    label:         'A',
  },
  {
    webhook:       process.env.DISCORD_WEBHOOK_URL_B,
    themes:        new Set((process.env.NOTIFY_THEMES_B || '').split(',').map(s => s.trim()).filter(Boolean)),
    dayMin:        (process.env.NOTIFY_DAY_MIN_B || '0,17,17,17,17,17,0').split(',').map(Number),
    dayMax:        (process.env.NOTIFY_DAY_MAX_B || '24,24,24,24,24,24,24').split(',').map(Number),
    themeSettings: JSON.parse(process.env.NOTIFY_THEME_SETTINGS_B || '{}'),
    label:         'B',
  },
].filter(ch => ch.webhook && ch.themes.size > 0)

function isTimeAllowed(dateStr, timeStr, themeId, ch) {
  const dow    = new Date(dateStr + 'T00:00:00').getDay()
  const hour   = parseInt(timeStr.split(':')[0])
  const dayMin = ch.themeSettings[themeId]?.dayMin ?? ch.dayMin
  const dayMax = ch.themeSettings[themeId]?.dayMax ?? ch.dayMax
  if (dayMin[dow] === -1) return false
  return hour >= dayMin[dow] && hour < dayMax[dow]
}

function buildMessage(available) {
  let message = '🔔 **방탈출 예약 가능!**\n\n'
  for (const [, themeData] of Object.entries(available)) {
    const { name, emoji, branch, openDaysAhead, openHour, slots, reserveUrl } = themeData
    const openInfo = (openDaysAhead != null && openHour != null)
      ? `${openDaysAhead}일 전 ${openHour}시`
      : '-'
    message += `**[${branch}] ${name} ${emoji}**`
    message += ` *(예약 오픈: ${openInfo})*\n`
    for (const [date, times] of Object.entries(slots)) {
      const d     = new Date(date + 'T00:00:00')
      const label = `${d.getMonth() + 1}/${d.getDate()}(${['일','월','화','수','목','금','토'][d.getDay()]})`
      message += `  ${label}: ${times.join(', ')}\n`
    }
    message += `  → ${reserveUrl}\n\n`
  }
  return message
}

async function processChannel(ch) {
  const params = new URLSearchParams({
    dayMin:         ch.dayMin.join(','),
    dayMax:         ch.dayMax.join(','),
    themeSettings:  JSON.stringify(ch.themeSettings),
  })
  const res = await fetch(`${SITE_URL}/api/slots/all?${params}`)
  if (!res.ok) throw new Error(`[${ch.label}채널] API 호출 실패: ${res.status}`)
  const data = await res.json()

  const available = {}
  for (const [themeId, themeData] of Object.entries(data).filter(([id]) => ch.themes.has(id))) {
    const filtered = {}
    for (const [date, times] of Object.entries(themeData.slots ?? {})) {
      const filteredTimes = times.filter(t => isTimeAllowed(date, t, themeId, ch))
      if (filteredTimes.length > 0) filtered[date] = filteredTimes
    }
    if (Object.keys(filtered).length > 0) available[themeId] = { ...themeData, slots: filtered }
  }

  if (Object.keys(available).length === 0) {
    console.log(`[${ch.label}채널] 예약 가능한 슬롯 없음`)
    return
  }

  const dcRes = await fetch(ch.webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: buildMessage(available) }),
  })
  if (!dcRes.ok) throw new Error(`[${ch.label}채널] Discord 전송 실패: ${dcRes.status} ${await dcRes.text()}`)
  console.log(`[${ch.label}채널] 알림 전송 완료`)
}

const results = await Promise.allSettled(channels.map(processChannel))
let hasError = false
for (const result of results) {
  if (result.status === 'rejected') {
    console.error(result.reason)
    hasError = true
  }
}
if (hasError) process.exit(1)
