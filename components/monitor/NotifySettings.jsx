import { memo, useState, useEffect } from 'react'

const THEME_LIST = [
  { id: 'tutu',   name: '투투 어드벤처', emoji: '🗺️' },
  { id: 'ayako',  name: 'AYAKO',        emoji: '🎭' },
  { id: 'goerok', name: '괴록',          emoji: '👻' },
]

const NotifySettings = memo(function NotifySettings() {
  const [open, setOpen]         = useState(false)
  const [settings, setSettings] = useState({ weekdayMin: 17, weekendMin: 0 })
  const [themes, setThemes]     = useState(() => new Set(THEME_LIST.map(t => t.id)))
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    fetch('/api/notify-settings')
      .then(r => r.json())
      .then(data => {
        setSettings({
          weekdayMin: Number(data.NOTIFY_WEEKDAY_MIN ?? 17),
          weekendMin: Number(data.NOTIFY_WEEKEND_MIN ?? 0),
        })
        const list = (data.NOTIFY_THEMES ?? 'tutu,ayako,goerok').split(',').map(s => s.trim())
        setThemes(new Set(list))
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/notify-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        NOTIFY_WEEKDAY_MIN: String(settings.weekdayMin),
        NOTIFY_WEEKEND_MIN: String(settings.weekendMin),
        NOTIFY_THEMES: [...themes].join(','),
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleTheme = (id, checked) => {
    setThemes(prev => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  return (
    <div className="notify-card">
      <button className="notify-toggle" onClick={() => setOpen(o => !o)}>
        🔔 Discord 알림 설정 <span className="notify-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="notify-body">
          <div className="notify-row">
            <span className="notify-label">평일 알림 시작</span>
            <select
              className="notify-select"
              value={settings.weekdayMin}
              onChange={e => setSettings(s => ({ ...s, weekdayMin: Number(e.target.value) }))}
            >
              {Array.from({ length: 25 }, (_, i) => (
                <option key={i} value={i}>{i === 0 ? '전체' : `${i}시 이후`}</option>
              ))}
            </select>
          </div>
          <div className="notify-row">
            <span className="notify-label">주말 알림 시작</span>
            <select
              className="notify-select"
              value={settings.weekendMin}
              onChange={e => setSettings(s => ({ ...s, weekendMin: Number(e.target.value) }))}
            >
              {Array.from({ length: 25 }, (_, i) => (
                <option key={i} value={i}>{i === 0 ? '전체' : `${i}시 이후`}</option>
              ))}
            </select>
          </div>
          <div className="notify-row">
            <span className="notify-label">알림 테마</span>
            <div className="notify-themes">
              {THEME_LIST.map(t => (
                <label key={t.id} className="notify-theme-toggle">
                  <input
                    type="checkbox"
                    checked={themes.has(t.id)}
                    onChange={e => toggleTheme(t.id, e.target.checked)}
                  />
                  {t.emoji} {t.name}
                </label>
              ))}
            </div>
          </div>
          <button className="notify-save" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
          </button>
        </div>
      )}
    </div>
  )
})

export default NotifySettings
