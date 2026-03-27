import { memo } from 'react'

const AppHeader = memo(function AppHeader({ onRefreshAll, loading, lastAllCheck }) {
  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">키이스케이프 예약 모니터</h1>
        <p className="app-sub">홍대점 · 3개 테마 실시간 모니터링</p>
      </div>
      <div className="header-right">
        <button className="btn-all" onClick={onRefreshAll} disabled={loading}>
          {loading ? <><span className="spinner" /> 확인중...</> : '전체 새로고침'}
        </button>
        {lastAllCheck && (
          <span className="app-last-check">
            마지막 확인 {lastAllCheck.toLocaleTimeString('ko-KR')}
          </span>
        )}
      </div>
    </header>
  )
})

export default AppHeader
