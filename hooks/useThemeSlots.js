import { useState, useEffect, useCallback, useMemo } from 'react'

const POLL_INTERVAL_MS = 240 * 1000 // 크론 주기와 동일 (4분)

export function useThemeSlots(themes, notifyThemesRef, isSettingsLoaded) {
  const [slotsByTheme, setSlotsByTheme]       = useState({})
  const [loadingByTheme, setLoadingByTheme]   = useState({})
  const [isPolling, setIsPolling]             = useState(false)
  const [lastPolledAt, setLastPolledAt]       = useState(null)

  const fetchTheme = useCallback(async (themeId) => {
    setLoadingByTheme(prev => ({ ...prev, [themeId]: true }))
    try {
      const res  = await fetch(`/api/slots/${themeId}`)
      const data = await res.json()
      setSlotsByTheme(prev => ({
        ...prev,
        [themeId]: { slots: data.slots, checked_at: data.checked_at },
      }))
    } catch {
      setSlotsByTheme(prev => ({
        ...prev,
        [themeId]: { slots: {}, checked_at: new Date().toISOString() },
      }))
    } finally {
      setLoadingByTheme(prev => ({ ...prev, [themeId]: false }))
    }
  }, [])

  const refreshAll = useCallback(async () => {
    const enabledThemes = themes.filter(t => notifyThemesRef.current.has(t.id))
    if (enabledThemes.length === 0) { return }
    setIsPolling(true)
    await Promise.all(enabledThemes.map(t => fetchTheme(t.id)))
    setLastPolledAt(new Date())
    setIsPolling(false)
  }, [themes, fetchTheme]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSettingsLoaded) { return }
    refreshAll()
    const timer = setInterval(refreshAll, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refreshAll, isSettingsLoaded])

  const refreshCallbacks = useMemo(
    () => Object.fromEntries(themes.map(t => [t.id, () => fetchTheme(t.id)])),
    [themes, fetchTheme]
  )

  return { slotsByTheme, loadingByTheme, isPolling, lastPolledAt, refreshAll, refreshCallbacks }
}
