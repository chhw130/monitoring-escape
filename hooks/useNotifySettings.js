import { useState, useEffect, useRef, useCallback } from 'react'

const SUFFIXES = ['', '_B', '_C']

function getChannelEnabledSet(data, suffix, allIds) {
  const channelThemesStr = data[`NOTIFY_THEMES${suffix}`]
  if (!channelThemesStr) return new Set()

  const channelThemeIds = new Set(channelThemesStr.split(',').map(s => s.trim()).filter(Boolean))
  const baseEnabled = new Set(allIds.filter(id => channelThemeIds.has(id)))

  const disabledSet = new Set(
    (data[`NOTIFY_DISABLED_THEMES${suffix}`] ?? '').split(',').map(s => s.trim()).filter(Boolean)
  )
  return new Set([...baseEnabled].filter(id => !disabledSet.has(id)))
}

function parseEnabledThemeIds(data, allIds) {
  const combined = new Set()
  for (const suffix of SUFFIXES) {
    for (const id of getChannelEnabledSet(data, suffix, allIds)) {
      combined.add(id)
    }
  }
  return combined
}

export function useNotifySettings(themes) {
  const [notifyThemes, setNotifyThemes]     = useState(() => new Set(themes.map(t => t.id)))
  const [isLoaded, setIsLoaded]             = useState(false)
  const [togglingId, setTogglingId]         = useState(null)
  const notifyThemesRef                     = useRef(new Set())

  useEffect(() => {
    fetch('/api/notify-settings')
      .then(r => r.json())
      .then(data => {
        const allIds     = themes.map(t => t.id)
        const enabledSet = parseEnabledThemeIds(data, allIds)
        notifyThemesRef.current = enabledSet
        setNotifyThemes(enabledSet)
      })
      .catch(() => {
        notifyThemesRef.current = new Set(themes.map(t => t.id))
      })
      .finally(() => setIsLoaded(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = useCallback(async (themeId) => {
    const enable = !notifyThemesRef.current.has(themeId)

    // 낙관적 업데이트
    const optimistic = new Set(notifyThemesRef.current)
    enable ? optimistic.add(themeId) : optimistic.delete(themeId)
    notifyThemesRef.current = optimistic
    setNotifyThemes(new Set(optimistic))
    setTogglingId(themeId)

    try {
      const res  = await fetch('/api/notify-settings')
      const data = await res.json()

      const payload = {}
      for (const suffix of SUFFIXES) {
        const themes  = new Set((data[`NOTIFY_THEMES${suffix}`]          || '').split(',').map(s => s.trim()).filter(Boolean))
        const disabled = new Set((data[`NOTIFY_DISABLED_THEMES${suffix}`] || '').split(',').map(s => s.trim()).filter(Boolean))
        if (enable) { themes.add(themeId); disabled.delete(themeId) }
        else        { themes.delete(themeId); disabled.add(themeId) }
        payload[`NOTIFY_THEMES${suffix}`]          = [...themes].join(',')
        payload[`NOTIFY_DISABLED_THEMES${suffix}`] = [...disabled].join(',')
      }

      await fetch('/api/notify-settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
    } catch {
      // 실패 시 롤백
      const reverted = new Set(notifyThemesRef.current)
      enable ? reverted.delete(themeId) : reverted.add(themeId)
      notifyThemesRef.current = reverted
      setNotifyThemes(new Set(reverted))
    } finally {
      setTogglingId(null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { notifyThemes, notifyThemesRef, isLoaded, toggleTheme, togglingId }
}
