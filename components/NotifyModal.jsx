'use client'
import { useState, useEffect, useCallback } from 'react'
import './NotifyModal.css'

// 요일 인덱스: 0=일, 1=월, ..., 6=토
const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const WEEKDAY_IDX = [1, 2, 3, 4, 5]
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

const HourMinSelect = ({ value, onChange, compact }) => (
  <select
    className={`modal-select${compact ? ' modal-select-compact' : ''}`}
    value={value}
    onChange={e => onChange(Number(e.target.value))}
  >
    <option value={-1}>없음</option>
    {Array.from({ length: 25 }, (_, i) => (
      <option key={i} value={i}>{i === 0 ? '전체' : `${i}시~`}</option>
    ))}
  </select>
)

const HourMaxSelect = ({ value, onChange, compact }) => (
  <select
    className={`modal-select${compact ? ' modal-select-compact' : ''}`}
    value={value}
    onChange={e => onChange(Number(e.target.value))}
  >
    {Array.from({ length: 24 }, (_, i) => (
      <option key={i + 1} value={i + 1}>{i + 1 === 24 ? '제한없음' : `~${i + 1}시`}</option>
    ))}
  </select>
)

export default function NotifyModal({ branches, onClose }) {
  const [dayMin, setDayMin]               = useState(DEFAULT_DAY_MIN)
  const [dayMax, setDayMax]               = useState(DEFAULT_DAY_MAX)
  const [notifyThemes, setNotifyThemes]   = useState(new Set())
  // { [themeId]: { dayMin: number[], dayMax: number[] } }
  const [themeSettings, setThemeSettings] = useState({})
  const [openCustom, setOpenCustom]       = useState(new Set())
  const [openBranches, setOpenBranches]   = useState(new Set())
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)

  useEffect(() => {
    fetch('/api/notify-settings')
      .then(r => r.json())
      .then(data => {
        setDayMin(parseDayMin(data.NOTIFY_DAY_MIN ?? ''))
        setDayMax(parseDayMax(data.NOTIFY_DAY_MAX ?? ''))
        const allIds = branches.flatMap(b => b.themes.map(t => t.id))
        const disabledList = (data.NOTIFY_DISABLED_THEMES ?? '').split(',').map(s => s.trim()).filter(Boolean)
        let enabledSet
        if (disabledList.length > 0) {
          const disabled = new Set(disabledList)
          enabledSet = new Set(allIds.filter(id => !disabled.has(id)))
        } else if (data.NOTIFY_THEMES) {
          const oldEnabled = new Set(data.NOTIFY_THEMES.split(',').map(s => s.trim()).filter(Boolean))
          enabledSet = new Set(allIds.filter(id => oldEnabled.has(id)))
        } else {
          enabledSet = new Set(allIds)
        }
        setNotifyThemes(enabledSet)
        try {
          const parsed = JSON.parse(data.NOTIFY_THEME_SETTINGS ?? '{}')
          const valid = {}
          for (const [id, cfg] of Object.entries(parsed)) {
            if (Array.isArray(cfg.dayMin) && cfg.dayMin.length === 7) {
              valid[id] = {
                dayMin: cfg.dayMin,
                dayMax: Array.isArray(cfg.dayMax) && cfg.dayMax.length === 7 ? cfg.dayMax : [...DEFAULT_DAY_MAX],
              }
            }
          }
          setThemeSettings(valid)
          setOpenCustom(new Set(Object.keys(valid)))
        } catch { /* 파싱 실패 시 무시 */ }
      })
      .catch(() => {})
  }, [branches])

  const toggleBranch = useCallback((branchId) => {
    setOpenBranches(prev => {
      const next = new Set(prev)
      next.has(branchId) ? next.delete(branchId) : next.add(branchId)
      return next
    })
  }, [])

  const disableAll = useCallback(() => setNotifyThemes(new Set()), [])

  const toggleTheme = useCallback((id) => {
    setNotifyThemes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback((themeIds, checked) => {
    setNotifyThemes(prev => {
      const next = new Set(prev)
      themeIds.forEach(id => checked ? next.add(id) : next.delete(id))
      return next
    })
  }, [])

  const setGlobalDayMin = useCallback((idx, val) => {
    setDayMin(prev => prev.map((v, i) => i === idx ? val : v))
  }, [])

  const setGlobalDayMax = useCallback((idx, val) => {
    setDayMax(prev => prev.map((v, i) => i === idx ? val : v))
  }, [])

  const toggleCustom = useCallback((id, currentDayMin, currentDayMax) => {
    setOpenCustom(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setThemeSettings(s => { const n = { ...s }; delete n[id]; return n })
      } else {
        next.add(id)
        setThemeSettings(s => ({ ...s, [id]: { dayMin: [...currentDayMin], dayMax: [...currentDayMax] } }))
      }
      return next
    })
  }, [])

  const setThemeDayMin = useCallback((themeId, idx, val) => {
    setThemeSettings(prev => ({
      ...prev,
      [themeId]: { ...prev[themeId], dayMin: prev[themeId].dayMin.map((v, i) => i === idx ? val : v) },
    }))
  }, [])

  const setThemeDayMax = useCallback((themeId, idx, val) => {
    setThemeSettings(prev => ({
      ...prev,
      [themeId]: { ...prev[themeId], dayMax: prev[themeId].dayMax.map((v, i) => i === idx ? val : v) },
    }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const filteredSettings = {}
    for (const id of openCustom) {
      if (themeSettings[id]) filteredSettings[id] = themeSettings[id]
    }
    await fetch('/api/notify-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        NOTIFY_DAY_MIN:         dayMin.join(','),
        NOTIFY_DAY_MAX:         dayMax.join(','),
        NOTIFY_THEMES:          [...notifyThemes].join(','),
        NOTIFY_DISABLED_THEMES: branches.flatMap(b => b.themes.map(t => t.id)).filter(id => !notifyThemes.has(id)).join(','),
        NOTIFY_THEME_SETTINGS:  JSON.stringify(filteredSettings),
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

        <div className="modal-body">
          <section className="modal-section">
            <h3 className="modal-section-title">기본 알림 시간대</h3>
            <p className="modal-section-hint">요일별 알림을 받을 시간 범위입니다. 테마 커스텀 설정이 없으면 이 값이 적용됩니다.</p>
            <div className="modal-day-grid">
              {DAYS.map((label, idx) => (
                <div key={idx} className={`modal-day-item${WEEKEND_IDX.includes(idx) ? ' weekend' : ''}`}>
                  <span className="modal-day-label">{label}</span>
                  <HourMinSelect
                    compact
                    value={dayMin[idx]}
                    onChange={v => setGlobalDayMin(idx, v)}
                  />
                  {dayMin[idx] !== -1 && (
                    <>
                      <span className="modal-day-sep">~</span>
                      <HourMaxSelect
                        compact
                        value={dayMax[idx]}
                        onChange={v => setGlobalDayMax(idx, v)}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="modal-section">
            <div className="modal-section-header">
              <h3 className="modal-section-title">알림 테마</h3>
              <button className="modal-disable-all-btn" onClick={disableAll}>모든 알람 해제</button>
            </div>
            {branches.map(branch => {
              const ids = branch.themes.map(t => t.id)
              const allChecked = ids.every(id => notifyThemes.has(id))
              const isOpen = openBranches.has(branch.id)
              return (
                <div key={branch.id} className="modal-branch">
                  <button
                    className="modal-branch-header"
                    onClick={() => toggleBranch(branch.id)}
                  >
                    <span className="modal-branch-name">
                      <span className={`modal-branch-chevron${isOpen ? ' open' : ''}`}>›</span>
                      {branch.brand} {branch.name}
                    </span>
                    <label
                      className="modal-theme-toggle"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={e => toggleAll(ids, e.target.checked)}
                      />
                      전체
                    </label>
                  </button>
                  {isOpen && (
                    <div className="modal-themes">
                      {branch.themes.map(theme => {
                        const isCustomOpen = openCustom.has(theme.id)
                        const customDayMin = themeSettings[theme.id]?.dayMin ?? [...dayMin]
                        const customDayMax = themeSettings[theme.id]?.dayMax ?? [...dayMax]
                        return (
                          <div key={theme.id} className="modal-theme-row">
                            <div className="modal-theme-row-header">
                              <label className="modal-theme-toggle">
                                <input
                                  type="checkbox"
                                  checked={notifyThemes.has(theme.id)}
                                  onChange={() => toggleTheme(theme.id)}
                                />
                                {theme.emoji} {theme.name}
                              </label>
                              <button
                                className={`modal-custom-btn${isCustomOpen ? ' active' : ''}`}
                                onClick={() => toggleCustom(theme.id, dayMin, dayMax)}
                                title={isCustomOpen ? '커스텀 설정 제거' : '개별 시간 설정'}
                              >
                                {isCustomOpen ? '커스텀 ✕' : '커스텀'}
                              </button>
                            </div>
                            {isCustomOpen && (
                              <div className="modal-theme-custom">
                                <div className="modal-day-grid">
                                  {DAYS.map((label, idx) => (
                                    <div key={idx} className={`modal-day-item${WEEKEND_IDX.includes(idx) ? ' weekend' : ''}`}>
                                      <span className="modal-day-label">{label}</span>
                                      <HourMinSelect
                                        compact
                                        value={customDayMin[idx]}
                                        onChange={v => setThemeDayMin(theme.id, idx, v)}
                                      />
                                      {customDayMin[idx] !== -1 && (
                                        <>
                                          <span className="modal-day-sep">~</span>
                                          <HourMaxSelect
                                            compact
                                            value={customDayMax[idx]}
                                            onChange={v => setThemeDayMax(theme.id, idx, v)}
                                          />
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
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
