import { memo } from 'react'

const SummaryBar = memo(function SummaryBar({ totalDates, onReset, isDefault }) {
  return (
    <div className="summary-bar">
      <span>
        전체 예약 가능&nbsp;
        <strong style={{ color: totalDates > 0 ? '#3ddc84' : '#ff5f5f' }}>
          {totalDates}개 날짜
        </strong>
      </span>
      <div className="interval-group">
        <span className="interval-label">⏱ 4분마다 갱신 중</span>
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
