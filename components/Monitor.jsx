'use client'
import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import AppHeader     from './monitor/AppHeader'
import FilterCard    from './monitor/FilterCard'
import NotifySettings from './monitor/NotifySettings'
import SummaryBar    from './monitor/SummaryBar'
import ThemeCard     from './monitor/ThemeCard'
import './Monitor.css'

const ALL_THEMES = [
  { id: 'tutu',   name: '투투 어드벤처', emoji: '🗺️', branchId: 'whosthere', reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=69&theme_info_num=60' },
  { id: 'ayako',  name: 'AYAKO',        emoji: '🎭', branchId: 'whosthere', reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=71&theme_info_num=63' },
  { id: 'goerok', name: '괴록',          emoji: '👻', branchId: 'whosthere', reserveUrl: 'https://www.keyescape.com/reservation1.php?zizum_num=23&theme_num=70&theme_info_num=61' },
]

const DEFAULT_INTERVAL = 180
const DEFAULT_MIN_HOUR = 7
const DEFAULT_MAX_HOUR = 24

function MonitorInner({ branchId, branchName }) {
  const THEMES = useMemo(() =>
    ALL_THEMES.filter(t => t.branchId === branchId),
    [branchId]
  )
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const intervalSec = Number(searchParams.get('interval')) || DEFAULT_INTERVAL
  const minHour     = Number(searchParams.get('minHour'))  || DEFAULT_MIN_HOUR
  const maxHour     = Number(searchParams.get('maxHour'))  || DEFAULT_MAX_HOUR

  const [themeData, setThemeData]       = useState({})
  const [loading, setLoading]           = useState({})
  const [allLoading, setAllLoading]     = useState(false)
  const [lastAllCheck, setLastAllCheck] = useState(null)
  const [nextRefresh, setNextRefresh]   = useState(intervalSec)
  const [localTimeRange, setLocalTimeRange] = useState([minHour, maxHour])
  const rangeUpdateTimer = useRef(null)

  useEffect(() => {
    setLocalTimeRange(prev =>
      prev[0] === minHour && prev[1] === maxHour ? prev : [minHour, maxHour]
    )
  }, [minHour, maxHour])

  const updateParams = useCallback((updates) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, val] of Object.entries(updates)) params.set(key, String(val))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const handleRangeChange = useCallback(([min, max]) => {
    setLocalTimeRange([min, max])
    clearTimeout(rangeUpdateTimer.current)
    rangeUpdateTimer.current = setTimeout(() => updateParams({ minHour: min, maxHour: max }), 300)
  }, [updateParams])

  const handleReset = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  const handleIntervalChange = useCallback((seconds) => {
    updateParams({ interval: seconds })
  }, [updateParams])

  const fetchTheme = useCallback(async (id) => {
    setLoading(prev => ({ ...prev, [id]: true }))
    try {
      const res  = await fetch(`/api/slots/${id}`)
      const data = await res.json()
      setThemeData(prev => ({ ...prev, [id]: { slots: data.slots, checked_at: data.checked_at } }))
    } catch {
      setThemeData(prev => ({ ...prev, [id]: { slots: {}, checked_at: new Date().toISOString() } }))
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

  // 테마별 안정적인 onRefresh 콜백 (fetchTheme이 안정적이므로 한 번만 생성)
  const refreshCallbacks = useMemo(() =>
    Object.fromEntries(THEMES.map(t => [t.id, () => fetchTheme(t.id)])),
    [fetchTheme]
  )

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

  const totalDates = useMemo(() =>
    Object.values(themeData).reduce((sum, d) => sum + Object.keys(d?.slots ?? {}).length, 0),
    [themeData]
  )

  const isDefault = useMemo(() =>
    intervalSec === DEFAULT_INTERVAL &&
    localTimeRange[0] === DEFAULT_MIN_HOUR &&
    localTimeRange[1] === DEFAULT_MAX_HOUR,
    [intervalSec, localTimeRange]
  )

  return (
    <div className="app">
      <AppHeader onRefreshAll={fetchAll} loading={allLoading} lastAllCheck={lastAllCheck} branchName={branchName} themeCount={THEMES.length} />

      <div className="legend-bar">
        <span className="chip chip-blue">~12시</span>
        <span className="chip chip-yellow">12~18시</span>
        <span className="chip chip-green">18시~</span>
      </div>

      <FilterCard value={localTimeRange} onChange={handleRangeChange} />

      <NotifySettings />

      <SummaryBar
        totalDates={totalDates}
        intervalSec={intervalSec}
        nextRefresh={nextRefresh}
        lastAllCheck={lastAllCheck}
        onIntervalChange={handleIntervalChange}
        onReset={handleReset}
        isDefault={isDefault}
      />

      <div className="cards-grid">
        {THEMES.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            data={themeData[theme.id] ?? null}
            loading={loading[theme.id] ?? false}
            onRefresh={refreshCallbacks[theme.id]}
            timeRange={localTimeRange}
          />
        ))}
      </div>
    </div>
  )
}

export default function Monitor({ branchId, branchName }) {
  return (
    <Suspense>
      <MonitorInner branchId={branchId} branchName={branchName} />
    </Suspense>
  )
}
