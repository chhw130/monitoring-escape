'use client'
import Link from 'next/link'
import './RankingSection.css'

const MEDAL = ['🥇', '🥈', '🥉']

export default function RankingSection({ rankedThemes }) {
  if (!rankedThemes?.length) return null

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
      <div className="ranking-scroll">
        {rankedThemes.map((theme, idx) => (
          <Link
            key={theme.themeId}
            href={`/${theme.branchId}`}
            className={`rank-card rank-pos-${idx < 3 ? idx + 1 : 'other'}`}
          >
            <div className="rank-badge">
              {idx < 3 ? MEDAL[idx] : `#${idx + 1}`}
            </div>
            <div className="rank-emoji">{theme.themeEmoji}</div>
            <div className="rank-theme-name">{theme.themeName}</div>
            <div className="rank-branch">{theme.branch}</div>
            <div className="rank-score">⭐ {theme.score}</div>
          </Link>
        ))}
      </div>
    </section>
  )
}
