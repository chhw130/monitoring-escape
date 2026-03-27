import { memo } from 'react'

const INTERVALS = [
  { label: '1분', seconds: 60 },
  { label: '3분', seconds: 180 },
  { label: '5분', seconds: 300 },
]

const SummaryBar = memo(function SummaryBar({
  totalDates, intervalSec, nextRefresh, lastAllCheck,
  onIntervalChange, onReset, isDefault,
}) {
  return (
    <div className="summary-bar">
      <span>
        전체 예약 가능&nbsp;
        <strong style={{ color: totalDates > 0 ? '#3ddc84' : '#ff5f5f' }}>
          {totalDates}개 날짜
        </strong>
      </span>
      <div className="interval-group">
        <span className="interval-label">⏱ 갱신 주기</span>
        {INTERVALS.map(({ label, seconds }) => (
          <button
            key={seconds}
            className={`interval-btn${intervalSec === seconds ? ' active' : ''}`}
            onClick={() => onIntervalChange(seconds)}
          >
            {label}
          </button>
        ))}
        {lastAllCheck && <span className="countdown">{nextRefresh}초 후</span>}
        <button
          className={`btn-reset${isDefault ? ' btn-reset-disabled' : ''}`}
          onClick={onReset}
          disabled={isDefault}
          title="필터 초기화"
        >
          초기화
        </button>
      </div>
    </div>
  )
})

export default SummaryBar
