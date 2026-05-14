'use client'
import { useMemo, Suspense } from 'react'
import AppHeader from './monitor/AppHeader'
import FilterCard from './monitor/FilterCard'
import SummaryBar from './monitor/SummaryBar'
import ThemeCard  from './monitor/ThemeCard'
import { useNotifySettings } from '@/hooks/useNotifySettings'
import { useThemeSlots }     from '@/hooks/useThemeSlots'
import { useTimeRangeParams } from '@/hooks/useTimeRangeParams'
import './Monitor.css'

function MonitorInner({ branchName, themes }) {
  const { localTimeRange, handleRangeChange, handleReset, isDefault } = useTimeRangeParams()
  const { notifyThemes, notifyThemesRef, isLoaded, toggleThemeNotify } = useNotifySettings(themes)
  const { slotsByTheme, loadingByTheme, isPolling, lastPolledAt, refreshAll, refreshCallbacks } = useThemeSlots(themes, notifyThemesRef, isLoaded)

  const totalAvailableDates = useMemo(() =>
    Object.values(slotsByTheme).reduce((sum, d) => sum + Object.keys(d?.slots ?? {}).length, 0),
    [slotsByTheme]
  )

  return (
    <div className="app">
      <AppHeader
        onRefreshAll={refreshAll}
        loading={isPolling}
        lastAllCheck={lastPolledAt}
        branchName={branchName}
        themeCount={themes.length}
      />

      <div className="legend-bar">
        <span className="chip chip-blue">~12시</span>
        <span className="chip chip-yellow">12~18시</span>
        <span className="chip chip-green">18시~</span>
      </div>

      <FilterCard value={localTimeRange} onChange={handleRangeChange} />

      <SummaryBar
        totalDates={totalAvailableDates}
        onReset={handleReset}
        isDefault={isDefault}
      />

      <div className="cards-grid">
        {themes.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            data={slotsByTheme[theme.id] ?? null}
            loading={loadingByTheme[theme.id] ?? false}
            onRefresh={refreshCallbacks[theme.id]}
            timeRange={localTimeRange}
            notifyEnabled={notifyThemes.has(theme.id)}
            onNotifyToggle={toggleThemeNotify}
          />
        ))}
      </div>
    </div>
  )
}

export default function Monitor({ branchId, brand, branchName, themes }) {
  return (
    <Suspense>
      <MonitorInner branchName={branchName} themes={themes} />
    </Suspense>
  )
}
