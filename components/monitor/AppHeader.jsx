import { memo } from 'react'
import Link from 'next/link'

const AppHeader = memo(function AppHeader({ onRefreshAll, loading, lastAllCheck, branchName, themeCount }) {
  return (
    <header className="app-header">
      <div>
        <Link href="/" className="back-link">← 지점 목록</Link>
        <h1 className="app-title">{branchName}</h1>
        <p className="app-sub">{themeCount}개 테마 실시간 모니터링</p>
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
