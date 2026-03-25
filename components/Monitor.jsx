'use client'
import { useState, useEffect, useCallback } from 'react'
import RangeSlider from './RangeSlider'
import './Monitor.css'

const THEMES = [
  { id: 'tutu',   name: '투투 어드벤처', emoji: '🗺️', reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=69&theme_info_num=60' },
  { id: 'ayako',  name: 'AYAKO',        emoji: '🎭', reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=71&theme_info_num=63' },
  { id: 'goerok', name: '괴록',          emoji: '👻', reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=70&theme_info_num=61' },
]

const INTERVALS = [
  { label: '1분', seconds: 60 },
  { label: '3분', seconds: 180 },
  { label: '5분', seconds: 300 },
]

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    short: `${d.getMonth() + 1}/${d.getDate()}`,
    dow: WEEKDAYS[d.getDay()],
  }
}

function ThemeCard({ theme, data, onRefresh, loading, timeRange }) {
  const openReservation = () => window.open(theme.reserveUrl, '_blank')
  const [minHour, maxHour] = timeRange
  const slots     = data?.slots ?? null
  const checkedAt = data?.checked_at ?? null

  const filterTime = (t) => {
    const h = parseInt(t.split(':')[0], 10)
    return h >= minHour && h < maxHour
  }
  const entries = slots
    ? Object.entries(slots)
        .map(([d, ts]) => [d, ts.filter(filterTime)])
        .filter(([, ts]) => ts.length > 0)
    : []
  const totalTimes = entries.reduce((s, [, ts]) => s + ts.length, 0)

  const statusColor =
    slots === null     ? '#666'    :
    entries.length > 0 ? '#3ddc84' : '#ff5f5f'
  const statusText =
    slots === null     ? '미확인'           :
    entries.length > 0 ? `${entries.length}일 가능` : '없음'

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
          <button className="btn-refresh" onClick={onRefresh} disabled={loading} title="새로고침">
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
          <div className="empty-state">새로고침을 눌러 확인하세요</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">😢 현재 예약 가능한 시간이 없습니다</div>
        ) : (
          <ul className="slot-list">
            {entries.map(([dateStr, times]) => {
              const { short, dow } = formatDate(dateStr)
              return (
                <li key={dateStr} className="slot-row slot-row-link" onClick={openReservation} title="클릭하면 예약 페이지로 이동">
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
}

export default function Monitor() {
  const [themeData, setThemeData]       = useState({})
  const [loading, setLoading]           = useState({})
  const [allLoading, setAllLoading]     = useState(false)
  const [lastAllCheck, setLastAllCheck] = useState(null)
  const [interval, setIntervalSec]      = useState(300)
  const [nextRefresh, setNextRefresh]   = useState(300)
  const [timeRange, setTimeRange]       = useState([7, 24])

  const fetchTheme = useCallback(async (id) => {
    setLoading(prev => ({ ...prev, [id]: true }))
    try {
      const res  = await fetch(`/api/slots/${id}`)
      const data = await res.json()
      setThemeData(prev => ({
        ...prev,
        [id]: { slots: data.slots, checked_at: data.checked_at },
      }))
    } catch {
      setThemeData(prev => ({
        ...prev,
        [id]: { slots: {}, checked_at: new Date().toISOString() },
      }))
    }
    setLoading(prev => ({ ...prev, [id]: false }))
  }, [])

  const fetchAll = useCallback(async () => {
    setAllLoading(true)
    try {
      const res  = await fetch('/api/slots/all')
      const data = await res.json()
      setThemeData(data)
      setLastAllCheck(new Date())
    } catch {
      await Promise.all(THEMES.map(t => fetchTheme(t.id)))
    }
    setAllLoading(false)
  }, [fetchTheme])

  useEffect(() => {
    fetchAll()
    setNextRefresh(interval)
    const timer = setInterval(fetchAll, interval * 1000)
    return () => clearInterval(timer)
  }, [fetchAll, interval])

  useEffect(() => {
    setNextRefresh(interval)
  }, [interval])

  useEffect(() => {
    const tick = setInterval(() => {
      setNextRefresh(prev => (prev <= 1 ? interval : prev - 1))
    }, 1000)
    return () => clearInterval(tick)
  }, [interval])

  const totalDates = Object.values(themeData).reduce(
    (sum, d) => sum + Object.keys(d?.slots ?? {}).length, 0
  )

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">키이스케이프 예약 모니터</h1>
          <p className="app-sub">홍대점 · 3개 테마 실시간 모니터링</p>
        </div>
        <div className="header-right">
          <button className="btn-all" onClick={fetchAll} disabled={allLoading}>
            {allLoading ? <><span className="spinner" /> 확인중...</> : '전체 새로고침'}
          </button>
          {lastAllCheck && (
            <span className="app-last-check">
              마지막 확인 {lastAllCheck.toLocaleTimeString('ko-KR')}
            </span>
          )}
        </div>
      </header>

      <div className="legend-bar">
        <span className="chip chip-blue">~12시</span>
        <span className="chip chip-yellow">12~18시</span>
        <span className="chip chip-green">18시~</span>
      </div>

      <div className="filter-card">
        <span className="filter-title">시간대 필터</span>
        <RangeSlider value={timeRange} onChange={setTimeRange} />
      </div>

      <div className="summary-bar">
        <span>
          전체 예약 가능&nbsp;
          <strong style={{ color: totalDates > 0 ? '#3ddc84' : '#ff5f5f' }}>
            {totalDates}개 날짜
          </strong>
        </span>
        <div className="interval-group">
          <span className="interval-label">⏱ 갱신 주기</span>
          {INTERVALS.map(({ label, seconds }) => (
            <button
              key={seconds}
              className={`interval-btn${interval === seconds ? ' active' : ''}`}
              onClick={() => setIntervalSec(seconds)}
            >
              {label}
            </button>
          ))}
          {lastAllCheck && (
            <span className="countdown">{nextRefresh}초 후</span>
          )}
        </div>
      </div>

      <div className="cards-grid">
        {THEMES.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            data={themeData[theme.id] ?? null}
            loading={loading[theme.id] ?? false}
            onRefresh={() => fetchTheme(theme.id)}
            timeRange={timeRange}
          />
        ))}
      </div>
    </div>
  )
}
