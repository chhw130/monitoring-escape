'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import './NotifyModal.css'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const WEEKEND_IDX = [0, 6]
const DEFAULT_DAY_MIN = [0, 17, 17, 17, 17, 17, 0]
const DEFAULT_DAY_MAX = [24, 24, 24, 24, 24, 24, 24]

function parseDayMin(str) {
  const parts = str.split(',').map(Number)
  if (parts.length === 7 && parts.every(n => !isNaN(n))) return parts
  return [...DEFAULT_DAY_MIN]
}

function parseDayMax(str) {
  const parts = str.split(',').map(Number)
  if (parts.length === 7 && parts.every(n => !isNaN(n))) return parts
  return [...DEFAULT_DAY_MAX]
}

function parseChannelData(data, suffix, allIds) {
  const k = suffix ? `_${suffix}` : ''
  const dayMin = parseDayMin(data[`NOTIFY_DAY_MIN${k}`] ?? '')
  const dayMax = parseDayMax(data[`NOTIFY_DAY_MAX${k}`] ?? '')
  const disabledList = (data[`NOTIFY_DISABLED_THEMES${k}`] ?? '').split(',').map(str => str.trim()).filter(Boolean)

  let notifyThemes
  if (disabledList.length > 0) {
    const disabled = new Set(disabledList)
    notifyThemes = new Set(allIds.filter(id => !disabled.has(id)))
  } else if (data[`NOTIFY_THEMES${k}`]) {
    const oldEnabled = new Set(data[`NOTIFY_THEMES${k}`].split(',').map(str => str.trim()).filter(Boolean))
    notifyThemes = new Set(allIds.filter(id => oldEnabled.has(id)))
  } else {
    notifyThemes = new Set(allIds)
  }

  const themeSettings = {}
  try {
    const parsed = JSON.parse(data[`NOTIFY_THEME_SETTINGS${k}`] ?? '{}')
    for (const [id, cfg] of Object.entries(parsed)) {
      if (Array.isArray(cfg.dayMin) && cfg.dayMin.length === 7) {
        themeSettings[id] = {
          dayMin: cfg.dayMin,
          dayMax: Array.isArray(cfg.dayMax) && cfg.dayMax.length === 7 ? cfg.dayMax : [...DEFAULT_DAY_MAX],
        }
      }
    }
  } catch { /* 파싱 실패 시 무시 */ }

  return {
    dayMin,
    dayMax,
    notifyThemes,
    themeSettings,
    openCustom: new Set(Object.keys(themeSettings)),
  }
}

const HourMinSelect = ({ value, onChange }) => (
  <select className="modal-select modal-select-time" value={value} onChange={e => onChange(Number(e.target.value))}>
    <option value={-1}>없음</option>
    {Array.from({ length: 25 }, (_, i) => (
      <option key={i} value={i}>{i === 0 ? '전체' : `${i}시 이후`}</option>
    ))}
  </select>
)

const HourMaxSelect = ({ value, onChange }) => (
  <select className="modal-select modal-select-time" value={value} onChange={e => onChange(Number(e.target.value))}>
    {Array.from({ length: 24 }, (_, i) => (
      <option key={i + 1} value={i + 1}>{i + 1 === 24 ? '제한없음' : `${i + 1}시 이전`}</option>
    ))}
  </select>
)

function DayRangeList({ dayMin, dayMax, onChangeMin, onChangeMax }) {
  return (
    <div className="modal-day-list">
      {DAYS.map((label, idx) => (
        <div key={idx} className={`modal-day-row${WEEKEND_IDX.includes(idx) ? ' weekend' : ''}`}>
          <span className="modal-day-row-label">{label}</span>
          <HourMinSelect value={dayMin[idx]} onChange={v => onChangeMin(idx, v)} />
          {dayMin[idx] !== -1 && (
            <>
              <span className="modal-day-sep">~</span>
              <HourMaxSelect value={dayMax[idx]} onChange={v => onChangeMax(idx, v)} />
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export default function NotifyModal({ branches, onClose }) {
  const allIds = branches.flatMap(b => b.themes.map(t => t.id))

  const [activeTab, setActiveTab] = useState('A')
  const [channelData, setChannelData] = useState({
    A: { dayMin: [...DEFAULT_DAY_MIN], dayMax: [...DEFAULT_DAY_MAX], notifyThemes: new Set(allIds), themeSettings: {}, openCustom: new Set() },
    B: { dayMin: [...DEFAULT_DAY_MIN], dayMax: [...DEFAULT_DAY_MAX], notifyThemes: new Set(allIds), themeSettings: {}, openCustom: new Set() },
  })
  const [openBranches, setOpenBranches] = useState(new Set())
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  const current    = channelData[activeTab]
  const dayMinRef  = useRef(current.dayMin)
  const dayMaxRef  = useRef(current.dayMax)
  useEffect(() => { dayMinRef.current = current.dayMin }, [current.dayMin])
  useEffect(() => { dayMaxRef.current = current.dayMax }, [current.dayMax])

  useEffect(() => {
    fetch('/api/notify-settings')
      .then(r => r.json())
      .then(data => {
        setChannelData({
          A: parseChannelData(data, null, allIds),
          B: parseChannelData(data, 'B', allIds),
        })
      })
      .catch(() => {})
  }, [branches])

  const updateCurrent = useCallback((updater) => {
    setChannelData(prev => ({ ...prev, [activeTab]: updater(prev[activeTab]) }))
  }, [activeTab])

  const toggleBranch = useCallback((branchId) => {
    setOpenBranches(prev => {
      const next = new Set(prev)
      next.has(branchId) ? next.delete(branchId) : next.add(branchId)
      return next
    })
  }, [])

  const disableAll = useCallback(() => {
    updateCurrent(ch => ({ ...ch, notifyThemes: new Set() }))
  }, [updateCurrent])

  const toggleTheme = useCallback((id) => {
    updateCurrent(ch => {
      const next = new Set(ch.notifyThemes)
      next.has(id) ? next.delete(id) : next.add(id)
      return { ...ch, notifyThemes: next }
    })
  }, [updateCurrent])

  const toggleAll = useCallback((themeIds, checked) => {
    updateCurrent(ch => {
      const next = new Set(ch.notifyThemes)
      themeIds.forEach(id => checked ? next.add(id) : next.delete(id))
      return { ...ch, notifyThemes: next }
    })
  }, [updateCurrent])

  const setGlobalDayMin = useCallback((idx, val) => {
    updateCurrent(ch => ({ ...ch, dayMin: ch.dayMin.map((v, i) => i === idx ? val : v) }))
  }, [updateCurrent])

  const setGlobalDayMax = useCallback((idx, val) => {
    updateCurrent(ch => ({ ...ch, dayMax: ch.dayMax.map((v, i) => i === idx ? val : v) }))
  }, [updateCurrent])

  const toggleCustom = useCallback((id) => {
    updateCurrent(ch => {
      const nextOpenCustom = new Set(ch.openCustom)
      if (nextOpenCustom.has(id)) {
        nextOpenCustom.delete(id)
        const { [id]: _, ...restSettings } = ch.themeSettings
        return { ...ch, openCustom: nextOpenCustom, themeSettings: restSettings }
      }
      nextOpenCustom.add(id)
      return {
        ...ch,
        openCustom: nextOpenCustom,
        themeSettings: {
          ...ch.themeSettings,
          [id]: { dayMin: [...dayMinRef.current], dayMax: [...dayMaxRef.current] },
        },
      }
    })
  }, [updateCurrent])

  const setThemeDayMin = useCallback((themeId, idx, val) => {
    updateCurrent(ch => ({
      ...ch,
      themeSettings: {
        ...ch.themeSettings,
        [themeId]: { ...ch.themeSettings[themeId], dayMin: ch.themeSettings[themeId].dayMin.map((v, i) => i === idx ? val : v) },
      },
    }))
  }, [updateCurrent])

  const setThemeDayMax = useCallback((themeId, idx, val) => {
    updateCurrent(ch => ({
      ...ch,
      themeSettings: {
        ...ch.themeSettings,
        [themeId]: { ...ch.themeSettings[themeId], dayMax: ch.themeSettings[themeId].dayMax.map((v, i) => i === idx ? val : v) },
      },
    }))
  }, [updateCurrent])

  const handleSave = async () => {
    setSaving(true)
    const buildPayload = (ch, suffix) => {
      const k = suffix ? `_${suffix}` : ''
      const filteredSettings = {}
      for (const id of ch.openCustom) {
        if (ch.themeSettings[id]) filteredSettings[id] = ch.themeSettings[id]
      }
      return {
        [`NOTIFY_DAY_MIN${k}`]:          ch.dayMin.join(','),
        [`NOTIFY_DAY_MAX${k}`]:          ch.dayMax.join(','),
        [`NOTIFY_THEMES${k}`]:           [...ch.notifyThemes].join(','),
        [`NOTIFY_DISABLED_THEMES${k}`]:  allIds.filter(id => !ch.notifyThemes.has(id)).join(','),
        [`NOTIFY_THEME_SETTINGS${k}`]:   JSON.stringify(filteredSettings),
      }
    }
    await fetch('/api/notify-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...buildPayload(channelData.A, null),
        ...buildPayload(channelData.B, 'B'),
      }),
    }).catch(console.error)
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">🔔 Discord 알림 설정</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          {['A', 'B'].map(tab => (
            <button
              key={tab}
              className={`modal-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}채널
            </button>
          ))}
        </div>

        <div className="modal-body">
          <section className="modal-section">
            <h3 className="modal-section-title">기본 알림 시간대</h3>
            <p className="modal-section-hint">테마 커스텀 설정이 없으면 이 기준이 적용됩니다.</p>
            <DayRangeList
              dayMin={current.dayMin}
              dayMax={current.dayMax}
              onChangeMin={setGlobalDayMin}
              onChangeMax={setGlobalDayMax}
            />
          </section>

          <section className="modal-section">
            <div className="modal-section-header">
              <h3 className="modal-section-title">알림 테마</h3>
              <button className="modal-disable-all-btn" onClick={disableAll}>모든 알람 해제</button>
            </div>
            {branches.map(branch => {
              const ids = branch.themes.map(t => t.id)
              const allChecked = ids.every(id => current.notifyThemes.has(id))
              const isOpen = openBranches.has(branch.id)
              return (
                <div key={branch.id} className="modal-branch">
                  <button className="modal-branch-header" onClick={() => toggleBranch(branch.id)}>
                    <span className="modal-branch-name">
                      <span className={`modal-branch-chevron${isOpen ? ' open' : ''}`}>›</span>
                      {branch.brand} {branch.name}
                    </span>
                    <label className="modal-theme-toggle" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={allChecked} onChange={e => toggleAll(ids, e.target.checked)} />
                      전체
                    </label>
                  </button>
                  {isOpen && (
                    <div className="modal-themes">
                      {branch.themes.map(theme => {
                        const isCustomOpen = current.openCustom.has(theme.id)
                        const customDayMin = current.themeSettings[theme.id]?.dayMin ?? current.dayMin
                        const customDayMax = current.themeSettings[theme.id]?.dayMax ?? current.dayMax
                        return (
                          <div key={theme.id} className="modal-theme-row">
                            <div className="modal-theme-row-header">
                              <label className="modal-theme-toggle">
                                <input
                                  type="checkbox"
                                  checked={current.notifyThemes.has(theme.id)}
                                  onChange={() => toggleTheme(theme.id)}
                                />
                                {theme.emoji} {theme.name}
                              </label>
                              <button
                                className={`modal-custom-btn${isCustomOpen ? ' active' : ''}`}
                                onClick={() => toggleCustom(theme.id)}
                                title={isCustomOpen ? '커스텀 설정 제거' : '개별 시간 설정'}
                              >
                                {isCustomOpen ? '커스텀 ✕' : '커스텀'}
                              </button>
                            </div>
                            {isCustomOpen && (
                              <div className="modal-theme-custom">
                                <DayRangeList
                                  dayMin={customDayMin}
                                  dayMax={customDayMax}
                                  onChangeMin={(idx, v) => setThemeDayMin(theme.id, idx, v)}
                                  onChangeMax={(idx, v) => setThemeDayMax(theme.id, idx, v)}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose}>취소</button>
          <button className="modal-save" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
