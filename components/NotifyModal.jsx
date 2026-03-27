'use client'
import { useState, useEffect, useCallback } from 'react'
import './NotifyModal.css'

// 요일 인덱스: 0=일, 1=월, ..., 6=토
const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const WEEKDAY_IDX = [1, 2, 3, 4, 5]
const WEEKEND_IDX = [0, 6]
const DEFAULT_DAY_MIN = [0, 17, 17, 17, 17, 17, 0] // 일~토

function parseDayMin(str) {
  const parts = str.split(',').map(Number)
  if (parts.length === 7 && parts.every(n => !isNaN(n))) return parts
  return [...DEFAULT_DAY_MIN]
}

const HourSelect = ({ value, onChange, compact }) => (
  <select
    className={`modal-select${compact ? ' modal-select-compact' : ''}`}
    value={value}
    onChange={e => onChange(Number(e.target.value))}
  >
    {Array.from({ length: 25 }, (_, i) => (
      <option key={i} value={i}>{i === 0 ? '전체' : `${i}시 이후`}</option>
    ))}
  </select>
)

const DayGrid = ({ dayMin, setDay, setBatch, compact }) => (
  <>
    {!compact && (
      <div className="modal-batch-row">
        <span className="modal-label">평일 일괄</span>
        <HourSelect value={dayMin[1]} onChange={v => setBatch(WEEKDAY_IDX, v)} />
        <span className="modal-label modal-label-gap">주말 일괄</span>
        <HourSelect value={dayMin[0]} onChange={v => setBatch(WEEKEND_IDX, v)} />
      </div>
    )}
    <div className="modal-day-grid">
      {DAYS.map((label, idx) => (
        <div key={idx} className={`modal-day-item${WEEKEND_IDX.includes(idx) ? ' weekend' : ''}`}>
          <span className="modal-day-label">{label}</span>
          <HourSelect compact value={dayMin[idx]} onChange={v => setDay(idx, v)} />
        </div>
      ))}
    </div>
  </>
)

export default function NotifyModal({ branches, onClose }) {
  const [dayMin, setDayMin]               = useState(DEFAULT_DAY_MIN)
  const [notifyThemes, setNotifyThemes]   = useState(new Set())
  // { [themeId]: number[] } — dayMin 오버라이드가 있는 테마
  const [themeSettings, setThemeSettings] = useState({})
  // 커스텀 패널이 열린 테마 ID Set
  const [openCustom, setOpenCustom]       = useState(new Set())
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)

  useEffect(() => {
    fetch('/api/notify-settings')
      .then(r => r.json())
      .then(data => {
        setDayMin(parseDayMin(data.NOTIFY_DAY_MIN ?? ''))
        const savedThemes = (data.NOTIFY_THEMES ?? '').split(',').map(s => s.trim()).filter(Boolean)
        const all = branches.flatMap(b => b.themes.map(t => t.id))
        setNotifyThemes(new Set(savedThemes.length ? savedThemes : all))
        try {
          const parsed = JSON.parse(data.NOTIFY_THEME_SETTINGS ?? '{}')
          // dayMin 배열 검증
          const valid = {}
          for (const [id, cfg] of Object.entries(parsed)) {
            if (Array.isArray(cfg.dayMin) && cfg.dayMin.length === 7) valid[id] = cfg
          }
          setThemeSettings(valid)
          setOpenCustom(new Set(Object.keys(valid)))
        } catch { /* 파싱 실패 시 무시 */ }
      })
      .catch(() => {})
  }, [branches])

  const setGlobalDay = useCallback((idx, val) => {
    setDayMin(prev => prev.map((v, i) => i === idx ? val : v))
  }, [])

  const setGlobalBatch = useCallback((indices, val) => {
    setDayMin(prev => prev.map((v, i) => indices.includes(i) ? val : v))
  }, [])

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

  const toggleCustom = useCallback((id, currentDayMin) => {
    setOpenCustom(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setThemeSettings(s => { const n = { ...s }; delete n[id]; return n })
      } else {
        next.add(id)
        setThemeSettings(s => ({ ...s, [id]: { dayMin: [...currentDayMin] } }))
      }
      return next
    })
  }, [])

  const setThemeDay = useCallback((themeId, idx, val) => {
    setThemeSettings(prev => ({
      ...prev,
      [themeId]: { ...prev[themeId], dayMin: prev[themeId].dayMin.map((v, i) => i === idx ? val : v) },
    }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    // openCustom에 있는 테마만 themeSettings에 포함
    const filteredSettings = {}
    for (const id of openCustom) {
      if (themeSettings[id]) filteredSettings[id] = themeSettings[id]
    }
    await fetch('/api/notify-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        NOTIFY_DAY_MIN:       dayMin.join(','),
        NOTIFY_THEMES:        [...notifyThemes].join(','),
        NOTIFY_THEME_SETTINGS: JSON.stringify(filteredSettings),
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
            <h3 className="modal-section-title">기본 알림 시간 (전체 적용)</h3>
            <DayGrid
              dayMin={dayMin}
              setDay={setGlobalDay}
              setBatch={setGlobalBatch}
            />
          </section>

          <section className="modal-section">
            <h3 className="modal-section-title">알림 테마</h3>
            {branches.map(branch => {
              const ids = branch.themes.map(t => t.id)
              const allChecked = ids.every(id => notifyThemes.has(id))
              return (
                <div key={branch.id} className="modal-branch">
                  <div className="modal-branch-header">
                    <span className="modal-branch-name">{branch.brand} {branch.name}</span>
                    <label className="modal-theme-toggle">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={e => toggleAll(ids, e.target.checked)}
                      />
                      전체
                    </label>
                  </div>
                  <div className="modal-themes">
                    {branch.themes.map(theme => {
                      const isCustomOpen = openCustom.has(theme.id)
                      const customDayMin = themeSettings[theme.id]?.dayMin ?? [...dayMin]
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
                              onClick={() => toggleCustom(theme.id, dayMin)}
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
                                    <HourSelect
                                      compact
                                      value={customDayMin[idx]}
                                      onChange={v => setThemeDay(theme.id, idx, v)}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
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
