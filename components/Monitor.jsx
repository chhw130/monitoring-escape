'use client'
import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import AppHeader from './monitor/AppHeader'
import FilterCard from './monitor/FilterCard'
import SummaryBar from './monitor/SummaryBar'
import ThemeCard  from './monitor/ThemeCard'
import './Monitor.css'

const DEFAULT_INTERVAL = 180
const DEFAULT_MIN_HOUR = 7
const DEFAULT_MAX_HOUR = 24

function MonitorInner({ branchId, branchName, themes: THEMES }) {

  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const intervalSec = Number(searchParams.get('interval')) || DEFAULT_INTERVAL
  const minHour     = Number(searchParams.get('minHour'))  || DEFAULT_MIN_HOUR
  const maxHour     = Number(searchParams.get('maxHour'))  || DEFAULT_MAX_HOUR

  const [themeData, setThemeData]           = useState({})
  const [loading, setLoading]               = useState({})
  const [allLoading, setAllLoading]         = useState(false)
  const [lastAllCheck, setLastAllCheck]     = useState(null)
  const [nextRefresh, setNextRefresh]       = useState(intervalSec)
  const [localTimeRange, setLocalTimeRange] = useState([minHour, maxHour])
  const [notifyThemes, setNotifyThemes]     = useState(() => new Set(THEMES.map(t => t.id)))
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const rangeUpdateTimer = useRef(null)
  const notifyThemesRef  = useRef(new Set())

  // 알림 테마 설정 불러오기
  useEffect(() => {
    fetch('/api/notify-settings')
      .then(r => r.json())
      .then(data => {
        const list = (data.NOTIFY_THEMES ?? THEMES.map(t => t.id).join(',')).split(',').map(s => s.trim())
        const next = new Set(list)
        notifyThemesRef.current = next
        setNotifyThemes(next)
      })
      .catch(() => {
        notifyThemesRef.current = new Set(THEMES.map(t => t.id))
      })
      .finally(() => setSettingsLoaded(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // 테마 알림 토글 + 즉시 저장
  const handleNotifyToggle = useCallback((themeId) => {
    const prev = notifyThemesRef.current
    const next = new Set(prev)
    next.has(themeId) ? next.delete(themeId) : next.add(themeId)
    notifyThemesRef.current = next
    setNotifyThemes(next)
    fetch('/api/notify-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ NOTIFY_THEMES: [...next].join(',') }),
    }).catch(console.error)
  }, [])

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
    const enabledThemes = THEMES.filter(t => notifyThemesRef.current.has(t.id))
    if (enabledThemes.length === 0) return
    setAllLoading(true)
    await Promise.all(enabledThemes.map(t => fetchTheme(t.id)))
    setLastAllCheck(new Date())
    setAllLoading(false)
  }, [THEMES, fetchTheme])

  const refreshCallbacks = useMemo(() =>
    Object.fromEntries(THEMES.map(t => [t.id, () => fetchTheme(t.id)])),
    [THEMES, fetchTheme]
  )

  useEffect(() => {
    if (!settingsLoaded) return
    fetchAll()
    setNextRefresh(intervalSec)
    const timer = setInterval(fetchAll, intervalSec * 1000)
    return () => clearInterval(timer)
  }, [fetchAll, intervalSec, settingsLoaded])

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
            notifyEnabled={notifyThemes.has(theme.id)}
            onNotifyToggle={handleNotifyToggle}
          />
        ))}
      </div>
    </div>
  )
}

export default function Monitor({ branchId, branchName, themes }) {
  return (
    <Suspense>
      <MonitorInner branchId={branchId} branchName={branchName} themes={themes} />
    </Suspense>
  )
}
