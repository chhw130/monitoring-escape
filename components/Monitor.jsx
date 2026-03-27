'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
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

const DEFAULT_INTERVAL = 180
const DEFAULT_MIN_HOUR = 7
const DEFAULT_MAX_HOUR = 24

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

function MonitorInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const intervalSec = Number(searchParams.get('interval'))  || DEFAULT_INTERVAL
  const minHour     = Number(searchParams.get('minHour'))   || DEFAULT_MIN_HOUR
  const maxHour     = Number(searchParams.get('maxHour'))   || DEFAULT_MAX_HOUR

  const [themeData, setThemeData]       = useState({})
  const [loading, setLoading]           = useState({})
  const [allLoading, setAllLoading]     = useState(false)
  const [lastAllCheck, setLastAllCheck] = useState(null)
  const [nextRefresh, setNextRefresh]   = useState(intervalSec)
  const [notifyOpen, setNotifyOpen]     = useState(false)
  const [notifySettings, setNotifySettings] = useState({ weekdayMin: 17, weekendMin: 0 })
  const [notifySaving, setNotifySaving] = useState(false)
  const [notifySaved, setNotifySaved]   = useState(false)
  // 슬라이더는 로컬 state로 즉시 반응, URL은 드래그 종료 후 업데이트
  const [localTimeRange, setLocalTimeRange] = useState([minHour, maxHour])
  const rangeUpdateTimer = useRef(null)

  // 리셋 등 외부 URL 변경 시 로컬 state 동기화 (값이 다를 때만)
  useEffect(() => {
    setLocalTimeRange(prev =>
      prev[0] === minHour && prev[1] === maxHour ? prev : [minHour, maxHour]
    )
  }, [minHour, maxHour])

  const updateParams = useCallback((updates) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, val] of Object.entries(updates)) {
      params.set(key, String(val))
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const handleRangeChange = useCallback(([min, max]) => {
    setLocalTimeRange([min, max])
    clearTimeout(rangeUpdateTimer.current)
    rangeUpdateTimer.current = setTimeout(() => {
      updateParams({ minHour: min, maxHour: max })
    }, 300)
  }, [updateParams])

  const handleReset = () => {
    router.replace(pathname, { scroll: false })
  }

  // 알림 설정 불러오기
  useEffect(() => {
    fetch('/api/notify-settings')
      .then(r => r.json())
      .then(data => setNotifySettings({
        weekdayMin: Number(data.NOTIFY_WEEKDAY_MIN ?? 17),
        weekendMin: Number(data.NOTIFY_WEEKEND_MIN ?? 0),
      }))
      .catch(() => {})
  }, [])

  const saveNotifySettings = async () => {
    setNotifySaving(true)
    await fetch('/api/notify-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        NOTIFY_WEEKDAY_MIN: String(notifySettings.weekdayMin),
        NOTIFY_WEEKEND_MIN: String(notifySettings.weekendMin),
      }),
    })
    setNotifySaving(false)
    setNotifySaved(true)
    setTimeout(() => setNotifySaved(false), 2000)
  }

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
    setNextRefresh(intervalSec)
    const timer = setInterval(fetchAll, intervalSec * 1000)
    return () => clearInterval(timer)
  }, [fetchAll, intervalSec])

  useEffect(() => {
    const tick = setInterval(() => {
      setNextRefresh(prev => (prev <= 1 ? intervalSec : prev - 1))
    }, 1000)
    return () => clearInterval(tick)
  }, [intervalSec])

  const totalDates = Object.values(themeData).reduce(
    (sum, d) => sum + Object.keys(d?.slots ?? {}).length, 0
  )

  const isDefault =
    intervalSec === DEFAULT_INTERVAL &&
    localTimeRange[0] === DEFAULT_MIN_HOUR &&
    localTimeRange[1] === DEFAULT_MAX_HOUR

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
        <RangeSlider
          value={localTimeRange}
          onChange={handleRangeChange}
        />
      </div>

      <div className="notify-card">
        <button className="notify-toggle" onClick={() => setNotifyOpen(o => !o)}>
          🔔 Discord 알림 설정 <span className="notify-arrow">{notifyOpen ? '▲' : '▼'}</span>
        </button>
        {notifyOpen && (
          <div className="notify-body">
            <div className="notify-row">
              <span className="notify-label">평일 알림 시작</span>
              <select
                className="notify-select"
                value={notifySettings.weekdayMin}
                onChange={e => setNotifySettings(s => ({ ...s, weekdayMin: Number(e.target.value) }))}
              >
                {Array.from({ length: 25 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? '전체' : `${i}시 이후`}</option>
                ))}
              </select>
            </div>
            <div className="notify-row">
              <span className="notify-label">주말 알림 시작</span>
              <select
                className="notify-select"
                value={notifySettings.weekendMin}
                onChange={e => setNotifySettings(s => ({ ...s, weekendMin: Number(e.target.value) }))}
              >
                {Array.from({ length: 25 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? '전체' : `${i}시 이후`}</option>
                ))}
              </select>
            </div>
            <button
              className="notify-save"
              onClick={saveNotifySettings}
              disabled={notifySaving}
            >
              {notifySaving ? '저장 중...' : notifySaved ? '✓ 저장됨' : '저장'}
            </button>
          </div>
        )}
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
              className={`interval-btn${intervalSec === seconds ? ' active' : ''}`}
              onClick={() => updateParams({ interval: seconds })}
            >
              {label}
            </button>
          ))}
          {lastAllCheck && (
            <span className="countdown">{nextRefresh}초 후</span>
          )}
          <button
            className={`btn-reset${isDefault ? ' btn-reset-disabled' : ''}`}
            onClick={handleReset}
            disabled={isDefault}
            title="필터 초기화"
          >
            초기화
          </button>
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
            timeRange={localTimeRange}
          />
        ))}
      </div>
    </div>
  )
}

export default function Monitor() {
  return (
    <Suspense>
      <MonitorInner />
    </Suspense>
  )
}
