'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import NotifyModal from './NotifyModal'
import './MainPage.css'

const BRANCHES = [
  {
    id: 'whosthere',
    brand: '키이스케이프',
    name: '후즈데어점',
    location: '강남',
    themes: [
      { id: 'tutu',   name: '투투 어드벤처', emoji: '🗺️' },
      { id: 'ayako',  name: 'AYAKO',        emoji: '🎭' },
      { id: 'goerok', name: '괴록',          emoji: '👻' },
    ],
  },
  {
    id: 'oasis-hongdae',
    brand: '오아시스뮤지엄',
    name: '홍대점',
    location: '홍대',
    themes: [
      { id: 'oasis-1', name: '업사이드 다운',      emoji: '🙃' },
      { id: 'oasis-5', name: '미씽 삭스 미스터리', emoji: '🧦' },
      { id: 'oasis-6', name: '배드 타임',          emoji: '😈' },
      { id: 'oasis-8', name: '하이 맥스',          emoji: '🏆' },
    ],
  },
]

export default function MainPage() {
  const [query, setQuery]         = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return BRANCHES
    return BRANCHES.filter(b =>
      b.brand.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.location.toLowerCase().includes(q) ||
      b.themes.some(t => t.name.toLowerCase().includes(q))
    )
  }, [query])

  return (
    <div className="main-page">
      <header className="main-header">
        <div>
          <h1 className="main-title">방탈출 예약 모니터</h1>
          <p className="main-sub">실시간 예약 가능 현황을 확인하세요</p>
        </div>
        <button className="notify-btn" onClick={() => setModalOpen(true)}>
          🔔 알림 설정
        </button>
      </header>

      <div className="search-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="지점명, 테마명으로 검색..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="search-empty">"{query}"에 해당하는 지점이 없습니다.</p>
      ) : (
        <div className="branch-grid">
          {filtered.map(branch => (
            <Link key={branch.id} href={`/${branch.id}`} className="branch-card">
              <div className="branch-card-top">
                <span className="branch-brand">{branch.brand}</span>
                <span className="branch-location">📍 {branch.location}</span>
              </div>
              <h2 className="branch-name">{branch.name}</h2>
              <ul className="branch-themes">
                {branch.themes.map(t => (
                  <li key={t.id} className="branch-theme-item">{t.emoji} {t.name}</li>
                ))}
              </ul>
              <div className="branch-card-footer">
                <span className="branch-theme-count">{branch.themes.length}개 테마</span>
                <span className="branch-cta">모니터링 보기 →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {modalOpen && (
        <NotifyModal branches={BRANCHES} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
