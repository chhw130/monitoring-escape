import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const DEFAULT_MIN_HOUR = 7
const DEFAULT_MAX_HOUR = 24
const DEBOUNCE_MS      = 300

export function useTimeRangeParams() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const minHour = Number(searchParams.get('minHour')) || DEFAULT_MIN_HOUR
  const maxHour = Number(searchParams.get('maxHour')) || DEFAULT_MAX_HOUR

  const [localTimeRange, setLocalTimeRange] = useState([minHour, maxHour])
  const debounceTimer                       = useRef(null)

  useEffect(() => {
    setLocalTimeRange(prev =>
      prev[0] === minHour && prev[1] === maxHour ? prev : [minHour, maxHour]
    )
  }, [minHour, maxHour])

  const pushParams = useCallback((updates) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, val] of Object.entries(updates)) { params.set(key, String(val)) }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const handleRangeChange = useCallback(([min, max]) => {
    setLocalTimeRange([min, max])
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => pushParams({ minHour: min, maxHour: max }), DEBOUNCE_MS)
  }, [pushParams])

  const handleReset = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  const isDefault = localTimeRange[0] === DEFAULT_MIN_HOUR && localTimeRange[1] === DEFAULT_MAX_HOUR

  return { localTimeRange, handleRangeChange, handleReset, isDefault }
}
