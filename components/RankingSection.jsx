'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import './RankingSection.css'

const MEDAL = ['🥇', '🥈', '🥉']
const PAGE_SIZE = 10

export default function RankingSection({ rankedThemes, location }) {
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!rankedThemes?.length) return []
    if (!location || location === '전체') return rankedThemes
    return rankedThemes.filter(t => t.location === location)
  }, [rankedThemes, location])

  useEffect(() => { setPage(0) }, [location])

  if (!filtered.length) return null

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <section className="ranking-section">
      <div className="ranking-header">
        <span className="ranking-title">🏆 코방 랭킹 기준</span>
        <a
          className="ranking-source"
          href="https://colory.mooo.com/bba/ranking"
          target="_blank"
          rel="noopener noreferrer"
        >
          출처: 코로리방탈출 →
        </a>
      </div>

      <table className="ranking-table">
        <thead>
          <tr>
            <th className="col-rank">순위</th>
            <th className="col-theme">테마</th>
            <th className="col-branch">지점</th>
            <th className="col-score">평점</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((theme, idx) => {
            const rank = page * PAGE_SIZE + idx
            return (
              <tr key={theme.themeId} className={rank < 3 ? `row-top-${rank + 1}` : ''}>
                <td className="col-rank">
                  {rank < 3 ? MEDAL[rank] : `#${rank + 1}`}
                </td>
                <td className="col-theme">
                  <Link href={`/${theme.branchId}`} className="rank-theme-link">
                    <span className="rank-emoji">{theme.themeEmoji}</span>
                    <span className="rank-theme-name">{theme.themeName}</span>
                  </Link>
                </td>
                <td className="col-branch">{theme.branch}</td>
                <td className="col-score">{theme.score}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="ranking-pagination">
          <button
            className="page-btn"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
          >
            ←
          </button>
          <span className="page-info">{page + 1} / {totalPages}</span>
          <button
            className="page-btn"
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages - 1}
          >
            →
          </button>
        </div>
      )}
    </section>
  )
}
