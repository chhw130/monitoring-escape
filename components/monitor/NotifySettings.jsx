import { memo, useState, useEffect } from 'react'

const NotifySettings = memo(function NotifySettings() {
  const [open, setOpen]         = useState(false)
  const [settings, setSettings] = useState({ weekdayMin: 17, weekendMin: 0 })
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    fetch('/api/notify-settings')
      .then(r => r.json())
      .then(data => setSettings({
        weekdayMin: Number(data.NOTIFY_WEEKDAY_MIN ?? 17),
        weekendMin: Number(data.NOTIFY_WEEKEND_MIN ?? 0),
      }))
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
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
          <p className="notify-hint">테마별 알림은 각 카드의 🔔 버튼으로 설정하세요</p>
          <button className="notify-save" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
          </button>
        </div>
      )}
    </div>
  )
})

export default NotifySettings
