import { memo, useMemo } from 'react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return { short: `${d.getMonth() + 1}/${d.getDate()}`, dow: WEEKDAYS[d.getDay()] }
}

const ThemeCard = memo(function ThemeCard({ theme, data, onRefresh, loading, timeRange, notifyEnabled, onNotifyToggle }) {
  const openReservation = (dateStr) => {
    const base = theme.reserveUrl
    const url = dateStr
      ? base + (base.includes('?') ? '&' : '?') + 'date=' + dateStr
      : base
    window.open(url, '_blank')
  }
  const [minHour, maxHour] = timeRange

  const slots     = data?.slots ?? null
  const checkedAt = data?.checked_at ?? null

  const entries = useMemo(() => {
    if (!slots) return []
    return Object.entries(slots)
      .map(([d, ts]) => [d, ts.filter(t => {
        const h = parseInt(t.split(':')[0], 10)
        return h >= minHour && h < maxHour
      })])
      .filter(([, ts]) => ts.length > 0)
  }, [slots, minHour, maxHour])

  const totalTimes = useMemo(() =>
    entries.reduce((s, [, ts]) => s + ts.length, 0), [entries]
  )

  const statusColor = slots === null ? '#666' : entries.length > 0 ? '#3ddc84' : '#ff5f5f'
  const statusText  = slots === null ? '미확인' : entries.length > 0 ? `${entries.length}일 가능` : '없음'

  return (
    <div className="theme-card">
      <div className="card-head">
        <div className="card-title-row">
          <span className="theme-emoji">{theme.emoji}</span>
          <div>
            <h2 className="theme-name">{theme.name}</h2>
            {checkedAt && (
              <p className="last-check">
                {new Date(checkedAt).toLocaleTimeString('ko-KR', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })} 확인
              </p>
            )}
          </div>
        </div>
        <div className="card-head-right">
          <span className="status-badge" style={{
            background: statusColor + '22',
            color: statusColor,
            border: `1px solid ${statusColor}55`,
          }}>
            <span className="dot" style={{
              background: statusColor,
              animation: entries.length > 0 ? 'pulse 1.8s ease-in-out infinite' : 'none',
            }} />
            {statusText}
          </span>
          <button
            className={`btn-notify${notifyEnabled ? ' active' : ''}`}
            onClick={() => onNotifyToggle(theme.id)}
            title={notifyEnabled ? '알림 끄기' : '알림 켜기'}
          >
            {notifyEnabled ? '🔔' : '🔕'}
          </button>
          <button className="btn-refresh" onClick={onRefresh} disabled={loading || !notifyEnabled} title={notifyEnabled ? '새로고침' : '알림을 켜야 조회할 수 있습니다'}>
            {loading ? <span className="spinner" /> : '↻'}
          </button>
        </div>
      </div>

      {slots !== null && (
        <div className="stats-row">
          <div className="stat">
            <span className="stat-num" style={{ color: entries.length > 0 ? '#3ddc84' : '#ff5f5f' }}>
              {entries.length}
            </span>
            <span className="stat-label">가능 날짜</span>
          </div>
          <div className="stat">
            <span className="stat-num">{totalTimes}</span>
            <span className="stat-label">총 시간</span>
          </div>
          <div className="stat">
            <span className="stat-num">
              {entries.length > 0 ? formatDate(entries[0][0]).short : '-'}
            </span>
            <span className="stat-label">가장 빠른 날</span>
          </div>
        </div>
      )}

      <div className="slot-area">
        {slots === null ? (
          <div className="empty-state">{notifyEnabled ? '새로고침을 눌러 확인하세요' : '🔕 알림을 켜면 자동으로 조회됩니다'}</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">😢 현재 예약 가능한 시간이 없습니다</div>
        ) : (
          <ul className="slot-list">
            {entries.map(([dateStr, times]) => {
              const { short, dow } = formatDate(dateStr)
              return (
                <li key={dateStr} className="slot-row slot-row-link" onClick={() => openReservation(dateStr)} title="클릭하면 예약 페이지로 이동">
                  <div className="slot-date">
                    <span className="date-main">{short}</span>
                    <span className="date-dow">{dow}</span>
                  </div>
                  <div className="time-chips">
                    {times.map(t => {
                      const hour = parseInt(t.split(':')[0], 10)
                      const colorClass = hour < 12 ? 'chip-blue' : hour < 18 ? 'chip-yellow' : 'chip-green'
                      return <span key={t} className={`chip ${colorClass}`}>{t}</span>
                    })}
                  </div>
                  <span className="row-arrow">→</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
})

export default ThemeCard
