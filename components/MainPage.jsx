'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import NotifyModal from './NotifyModal'
import RankingSection from './RankingSection'
import './MainPage.css'

export default function MainPage({ branches, rankedThemes }) {
  const [query, setQuery]         = useState('')
  const [location, setLocation]   = useState('전체')
  const [modalOpen, setModalOpen] = useState(false)

  const locations = useMemo(() => {
    const seen = new Set()
    const result = ['전체']
    branches.forEach(b => { if (!seen.has(b.location)) { seen.add(b.location); result.push(b.location) } })
    return result
  }, [branches])

  const totalThemes = useMemo(() => branches.reduce((s, b) => s + b.themes.length, 0), [branches])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return branches.filter(b => {
      if (location !== '전체' && b.location !== location) return false
      if (!q) return true
      return (
        b.brand.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        b.themes.some(t => t.name.toLowerCase().includes(q))
      )
    })
  }, [query, location, branches])

  return (
    <div className="main-page">
      <header className="main-header">
        <div>
          <h1 className="main-title">방탈출 예약 모니터</h1>
          <p className="main-sub">
            실시간 예약 가능 현황을 확인하세요
            <span className="main-theme-count">· 총 {totalThemes}개 테마</span>
          </p>
        </div>
        <button className="notify-btn" onClick={() => setModalOpen(true)}>
          🔔 알림 설정
        </button>
      </header>

      <div className="filter-row">
        <div className="location-chips">
          {locations.map(loc => (
            <button
              key={loc}
              className={`location-chip${location === loc ? ' active' : ''}`}
              onClick={() => setLocation(loc)}
            >
              {loc}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="text"
          placeholder="지점명, 테마명으로 검색..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <RankingSection rankedThemes={rankedThemes} location={location} />

      {filtered.length === 0 ? (
        <p className="search-empty">조건에 맞는 지점이 없습니다.</p>
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
        <NotifyModal branches={branches} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
