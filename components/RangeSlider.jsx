'use client'
import { useRef, useCallback } from 'react'
import './RangeSlider.css'

const MIN_HOUR = 7
const MAX_HOUR = 24

function fmt(h) {
  return h === 24 ? '24:00' : `${String(h).padStart(2, '0')}:00`
}

export default function RangeSlider({ value, onChange }) {
  const [minVal, maxVal] = value
  const rangeRef = useRef(null)

  const pct = (v) => ((v - MIN_HOUR) / (MAX_HOUR - MIN_HOUR)) * 100

  const handleMin = useCallback((e) => {
    const v = Math.min(Number(e.target.value), maxVal - 1)
    onChange([v, maxVal])
  }, [maxVal, onChange])

  const handleMax = useCallback((e) => {
    const v = Math.max(Number(e.target.value), minVal + 1)
    onChange([minVal, v])
  }, [minVal, onChange])

  const label =
    minVal === MIN_HOUR && maxVal === MAX_HOUR
      ? '전체 시간'
      : `${fmt(minVal)} ~ ${fmt(maxVal)}`

  return (
    <div className="rs-wrap">
      <div className="rs-label">{label}</div>
      <div className="rs-track-wrap" ref={rangeRef}>
        <div
          className="rs-fill"
          style={{ left: `${pct(minVal)}%`, width: `${pct(maxVal) - pct(minVal)}%` }}
        />
        <input
          type="range"
          min={MIN_HOUR} max={MAX_HOUR} step={1}
          value={minVal}
          onChange={handleMin}
          className="rs-input rs-input-min"
        />
        <input
          type="range"
          min={MIN_HOUR} max={MAX_HOUR} step={1}
          value={maxVal}
          onChange={handleMax}
          className="rs-input rs-input-max"
        />
      </div>
      <div className="rs-ticks">
        <span>{fmt(MIN_HOUR)}</span>
        <span>{fmt(MAX_HOUR)}</span>
      </div>
    </div>
  )
}
