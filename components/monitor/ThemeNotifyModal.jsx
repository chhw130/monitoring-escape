'use client'
import { useState, useEffect, useCallback } from 'react'
import './ThemeNotifyModal.css'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const DEFAULT_DAY_MIN = [0, 17, 17, 17, 17, 17, 0]
const DEFAULT_DAY_MAX = [24, 24, 24, 24, 24, 24, 24]
const CHANNEL_ENTRIES = [['A', ''], ['B', '_B'], ['C', '_C']]

function parseDayMin(str) {
  const p = str.split(',').map(Number)
  return p.length === 7 && p.every(n => !isNaN(n)) ? p : [...DEFAULT_DAY_MIN]
}
function parseDayMax(str) {
  const p = str.split(',').map(Number)
  return p.length === 7 && p.every(n => !isNaN(n)) ? p : [...DEFAULT_DAY_MAX]
}

function parseChannelTheme(data, suffix, themeId) {
  const themes   = new Set((data[`NOTIFY_THEMES${suffix}`]          || '').split(',').map(s => s.trim()).filter(Boolean))
  const disabled = new Set((data[`NOTIFY_DISABLED_THEMES${suffix}`] || '').split(',').map(s => s.trim()).filter(Boolean))
  const enabled  = themes.has(themeId) && !disabled.has(themeId)

  const defaultDayMin = parseDayMin(data[`NOTIFY_DAY_MIN${suffix}`] ?? '')
  const defaultDayMax = parseDayMax(data[`NOTIFY_DAY_MAX${suffix}`] ?? '')

  let dayMin = [...defaultDayMin], dayMax = [...defaultDayMax], isCustom = false
  try {
    const ts = JSON.parse(data[`NOTIFY_THEME_SETTINGS${suffix}`] ?? '{}')
    if (ts[themeId]?.dayMin?.length === 7) {
      dayMin = ts[themeId].dayMin
      dayMax = ts[themeId].dayMax?.length === 7 ? ts[themeId].dayMax : [...defaultDayMax]
      isCustom = true
    }
  } catch {}

  return { enabled, dayMin, dayMax, isCustom, defaultDayMin, defaultDayMax }
}

export default function ThemeNotifyModal({ theme, onClose, onSaved }) {
  const [rawData,     setRawData]     = useState(null)
  const [channelData, setChannelData] = useState(null)
  const [activeTab,   setActiveTab]   = useState('A')
  const [fetching,    setFetching]    = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)

  useEffect(() => {
    fetch('/api/notify-settings')
      .then(r => r.json())
      .then(data => {
        setRawData(data)
        setChannelData({
          A: parseChannelTheme(data, '',    theme.id),
          B: parseChannelTheme(data, '_B',  theme.id),
          C: parseChannelTheme(data, '_C',  theme.id),
        })
      })
      .finally(() => setFetching(false))
  }, [theme.id])

  const update = useCallback((tab, updater) => {
    setChannelData(prev => ({ ...prev, [tab]: updater(prev[tab]) }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!rawData || !channelData) return
    setSaving(true)
    const payload = {}

    for (const [tab, suffix] of CHANNEL_ENTRIES) {
      const ch      = channelData[tab]
      const themes  = new Set((rawData[`NOTIFY_THEMES${suffix}`]          || '').split(',').map(s => s.trim()).filter(Boolean))
      const disabled = new Set((rawData[`NOTIFY_DISABLED_THEMES${suffix}`] || '').split(',').map(s => s.trim()).filter(Boolean))

      if (ch.enabled) { themes.add(theme.id); disabled.delete(theme.id) }
      else            { themes.delete(theme.id); disabled.add(theme.id) }

      let themeSettings = {}
      try { themeSettings = JSON.parse(rawData[`NOTIFY_THEME_SETTINGS${suffix}`] ?? '{}') } catch {}
      if (ch.isCustom) themeSettings[theme.id] = { dayMin: ch.dayMin, dayMax: ch.dayMax }
      else             delete themeSettings[theme.id]

      payload[`NOTIFY_THEMES${suffix}`]           = [...themes].join(',')
      payload[`NOTIFY_DISABLED_THEMES${suffix}`]  = [...disabled].join(',')
      payload[`NOTIFY_THEME_SETTINGS${suffix}`]   = JSON.stringify(themeSettings)
    }

    await fetch('/api/notify-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(console.error)

    setSaving(false)
    setSaved(true)
    onSaved?.()
    setTimeout(() => { setSaved(false); onClose() }, 700)
  }, [rawData, channelData, theme.id, onSaved, onClose])

  const current = channelData?.[activeTab]

  return (
    <div className="tmodal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tmodal">
        <div className="tmodal-header">
          <span className="tmodal-title">{theme.emoji} {theme.name} 알림 설정</span>
          <button className="tmodal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tmodal-tabs">
          {['A', 'B', 'C'].map(tab => (
            <button
              key={tab}
              className={`tmodal-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}채널
            </button>
          ))}
        </div>

        <div className="tmodal-body">
          {fetching ? (
            <div className="tmodal-loading">불러오는 중...</div>
          ) : current && (
            <>
              <div className="tmodal-enable-row">
                <span className="tmodal-enable-label">{activeTab}채널 알림</span>
                <button
                  className={`tmodal-toggle-btn${current.enabled ? ' on' : ''}`}
                  onClick={() => update(activeTab, ch => ({ ...ch, enabled: !ch.enabled }))}
                >
                  {current.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {current.enabled && (
                <>
                  <label className="tmodal-custom-check">
                    <input
                      type="checkbox"
                      checked={current.isCustom}
                      onChange={() => update(activeTab, ch => ({
                        ...ch,
                        isCustom:  !ch.isCustom,
                        dayMin:    !ch.isCustom ? [...ch.defaultDayMin] : ch.dayMin,
                        dayMax:    !ch.isCustom ? [...ch.defaultDayMax] : ch.dayMax,
                      }))}
                    />
                    이 테마만 별도 시간 설정
                  </label>

                  <div className={`tmodal-day-list${!current.isCustom ? ' dim' : ''}`}>
                    {DAYS.map((label, idx) => (
                      <div key={idx} className="tmodal-day-row">
                        <span className="tmodal-day-label">{label}</span>
                        <select
                          className="tmodal-select"
                          disabled={!current.isCustom}
                          value={current.dayMin[idx]}
                          onChange={e => update(activeTab, ch => ({
                            ...ch,
                            dayMin: ch.dayMin.map((v, i) => i === idx ? Number(e.target.value) : v),
                          }))}
                        >
                          <option value={-1}>없음</option>
                          {Array.from({ length: 25 }, (_, i) => (
                            <option key={i} value={i}>{i === 0 ? '전체' : `${i}시 이후`}</option>
                          ))}
                        </select>
                        {current.dayMin[idx] !== -1 && (
                          <>
                            <span className="tmodal-sep">~</span>
                            <select
                              className="tmodal-select"
                              disabled={!current.isCustom}
                              value={current.dayMax[idx]}
                              onChange={e => update(activeTab, ch => ({
                                ...ch,
                                dayMax: ch.dayMax.map((v, i) => i === idx ? Number(e.target.value) : v),
                              }))}
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  {i + 1 === 24 ? '제한없음' : `${i + 1}시 이전`}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="tmodal-footer">
          <button className="tmodal-cancel" onClick={onClose}>취소</button>
          <button className="tmodal-save" onClick={handleSave} disabled={saving || fetching}>
            {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
