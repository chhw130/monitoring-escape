'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NotifyModal from './NotifyModal'
import RankingSection from './RankingSection'
import './MainPage.css'

const SEARCH_DEBOUNCE_MS = 300

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <nav className="pagination">
      <button
        className="pagination-btn"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        ‹
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          className={`pagination-btn${p === page ? ' active' : ''}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="pagination-btn"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
    </nav>
  )
}

export default function MainPage({
  branches, rankedThemes, locations, totalThemes,
  page, totalPages, query, location,
}) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(query)
  const [modalOpen, setModalOpen] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const buildUrl = ({ nextQuery = query, nextLocation = location, nextPage = 1 }) => {
    const params = new URLSearchParams()
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    if (nextLocation !== '전체') params.set('location', nextLocation)
    if (nextPage > 1) params.set('page', String(nextPage))
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  // 검색어는 입력이 멈춘 뒤 URL에 반영해 서버에서 해당 페이지만 다시 받아온다
  const handleSearchChange = (value) => {
    setSearchInput(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.replace(buildUrl({ nextQuery: value }), { scroll: false })
    }, SEARCH_DEBOUNCE_MS)
  }

  const handleLocationChange = (loc) => {
    router.replace(buildUrl({ nextQuery: searchInput, nextLocation: loc }), { scroll: false })
  }

  const handlePageChange = (p) => {
    router.push(buildUrl({ nextPage: p }))
  }

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
              onClick={() => handleLocationChange(loc)}
            >
              {loc}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="text"
          placeholder="지점명, 테마명으로 검색..."
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
        />
      </div>

      <RankingSection rankedThemes={rankedThemes} location={location} />

      {branches.length === 0 ? (
        <p className="search-empty">조건에 맞는 지점이 없습니다.</p>
      ) : (
        <div className="branch-grid">
          {branches.map(branch => (
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

      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

      {modalOpen && (
        <NotifyModal onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
