import { useState, useEffect, useCallback, useRef } from 'react'

function parseEnabledThemeIds(data, allIds) {
  const disabledList = (data.NOTIFY_DISABLED_THEMES ?? '')
    .split(',').map(s => s.trim()).filter(Boolean)

  if (disabledList.length > 0) {
    const disabledSet = new Set(disabledList)
    return new Set(allIds.filter(id => !disabledSet.has(id)))
  }

  if (data.NOTIFY_THEMES) {
    const enabledSet = new Set(data.NOTIFY_THEMES.split(',').map(s => s.trim()).filter(Boolean))
    return new Set(allIds.filter(id => enabledSet.has(id)))
  }

  return new Set()
}

export function useNotifySettings(themes) {
  const [notifyThemes, setNotifyThemes] = useState(() => new Set(themes.map(t => t.id)))
  const [isLoaded, setIsLoaded]         = useState(false)
  const notifyThemesRef                 = useRef(new Set())

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

  const toggleThemeNotify = useCallback((themeId) => {
    const prev = notifyThemesRef.current
    const next = new Set(prev)
    if (next.has(themeId)) {
      next.delete(themeId)
    } else {
      next.add(themeId)
    }
    notifyThemesRef.current = next
    setNotifyThemes(next)

    const disabledIds = themes.map(t => t.id).filter(id => !next.has(id))
    fetch('/api/notify-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        NOTIFY_DISABLED_THEMES: disabledIds.join(','),
        NOTIFY_THEMES:          [...next].join(','),
      }),
    }).catch(console.error)
  }, [themes])

  return { notifyThemes, notifyThemesRef, isLoaded, toggleThemeNotify }
}
