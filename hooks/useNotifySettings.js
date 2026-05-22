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
  const [notifyThemes, setNotifyThemes] = useState(() => new Set(themes.map(t => t.id)))
  const [isLoaded, setIsLoaded]         = useState(false)
  const notifyThemesRef                 = useRef(new Set())

  const load = useCallback(() => {
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

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { notifyThemes, notifyThemesRef, isLoaded, refetch: load }
}
