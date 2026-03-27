import { useState, useEffect, useCallback } from 'react'
import './NotifyModal.css'

export default function NotifyModal({ branches, onClose }) {
  const [settings, setSettings]     = useState({ weekdayMin: 17, weekendMin: 0 })
  const [notifyThemes, setNotifyThemes] = useState(new Set())
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  useEffect(() => {
    fetch('/api/notify-settings')
      .then(r => r.json())
      .then(data => {
        setSettings({
          weekdayMin: Number(data.NOTIFY_WEEKDAY_MIN ?? 17),
          weekendMin: Number(data.NOTIFY_WEEKEND_MIN ?? 0),
        })
        const saved = (data.NOTIFY_THEMES ?? '').split(',').map(s => s.trim()).filter(Boolean)
        const all   = branches.flatMap(b => b.themes.map(t => t.id))
        setNotifyThemes(new Set(saved.length ? saved : all))
      })
      .catch(() => {})
  }, [branches])

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

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/notify-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        NOTIFY_WEEKDAY_MIN: String(settings.weekdayMin),
        NOTIFY_WEEKEND_MIN: String(settings.weekendMin),
        NOTIFY_THEMES: [...notifyThemes].join(','),
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
            <h3 className="modal-section-title">알림 시간</h3>
            <div className="modal-row">
              <span className="modal-label">평일 알림 시작</span>
              <select
                className="modal-select"
                value={settings.weekdayMin}
                onChange={e => setSettings(s => ({ ...s, weekdayMin: Number(e.target.value) }))}
              >
                {Array.from({ length: 25 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? '전체' : `${i}시 이후`}</option>
                ))}
              </select>
            </div>
            <div className="modal-row">
              <span className="modal-label">주말 알림 시작</span>
              <select
                className="modal-select"
                value={settings.weekendMin}
                onChange={e => setSettings(s => ({ ...s, weekendMin: Number(e.target.value) }))}
              >
                {Array.from({ length: 25 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? '전체' : `${i}시 이후`}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="modal-section">
            <h3 className="modal-section-title">알림 테마</h3>
            {branches.map(branch => {
              const ids       = branch.themes.map(t => t.id)
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
                    {branch.themes.map(theme => (
                      <label key={theme.id} className="modal-theme-toggle">
                        <input
                          type="checkbox"
                          checked={notifyThemes.has(theme.id)}
                          onChange={() => toggleTheme(theme.id)}
                        />
                        {theme.emoji} {theme.name}
                      </label>
                    ))}
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
