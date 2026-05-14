/**
 * 슬롯 날짜가 예약 오픈된 상태인지 확인
 * openDaysAhead일 전 openHour시 KST에 예약 오픈
 */
export function isBookable(dateStr, openDaysAhead, openHour) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const slotDate = new Date(Date.UTC(year, month - 1, day))
  const openTime = new Date(slotDate)
  openTime.setUTCDate(openTime.getUTCDate() - openDaysAhead)
  openTime.setUTCHours(openHour - 9, 0, 0, 0) // KST → UTC
  return Date.now() >= openTime.getTime()
}

/**
 * 오늘부터 days일치 날짜 배열 반환 (YYYY-MM-DD)
 */
export function getDateRange(days) {
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

/**
 * skipDows에 해당하는 요일의 날짜를 제외
 */
export function filterSkipDays(dates, skipDows) {
  if (skipDows.size === 0) { return dates }
  return dates.filter(d => !skipDows.has(new Date(d + 'T00:00:00').getDay()))
}

/**
 * 테마 슬롯 조회 결과를 공통 응답 형태로 변환
 */
export function buildThemeResult(theme, slots) {
  return {
    slots,
    checked_at:    new Date().toISOString(),
    name:          theme.name,
    emoji:         theme.emoji,
    branch:        theme.branch,
    openDaysAhead: theme.openDaysAhead,
    openHour:      theme.openHour,
    reserveUrl:    theme.reserveUrl,
  }
}
