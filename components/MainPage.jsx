import Link from 'next/link'
import './MainPage.css'

const BRANCHES = [
  {
    id: 'whosthere',
    brand: '키이스케이프',
    name: '후즈데어점',
    location: '홍대',
    themeCount: 3,
    themes: ['투투 어드벤처 🗺️', 'AYAKO 🎭', '괴록 👻'],
  },
]

export default function MainPage() {
  return (
    <div className="main-page">
      <header className="main-header">
        <h1 className="main-title">방탈출 예약 모니터</h1>
        <p className="main-sub">실시간 예약 가능 현황을 확인하세요</p>
      </header>

      <div className="branch-grid">
        {BRANCHES.map(branch => (
          <Link key={branch.id} href={`/${branch.id}`} className="branch-card">
            <div className="branch-card-top">
              <span className="branch-brand">{branch.brand}</span>
              <span className="branch-location">📍 {branch.location}</span>
            </div>
            <h2 className="branch-name">{branch.name}</h2>
            <ul className="branch-themes">
              {branch.themes.map(t => (
                <li key={t} className="branch-theme-item">{t}</li>
              ))}
            </ul>
            <div className="branch-card-footer">
              <span className="branch-theme-count">{branch.themeCount}개 테마</span>
              <span className="branch-cta">모니터링 보기 →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
