import { memo } from 'react'
import RangeSlider from '../RangeSlider'

const FilterCard = memo(function FilterCard({ value, onChange }) {
  return (
    <div className="filter-card">
      <span className="filter-title">시간대 필터</span>
      <RangeSlider value={value} onChange={onChange} />
    </div>
  )
})

export default FilterCard
