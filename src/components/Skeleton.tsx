/** 產題期間的 skeleton loading（§6.2、§9.7） */

import './Skeleton.css'

export function Skeleton() {
  return (
    // FR-2.3：載入期間任何點擊皆無效
    <div className="skeleton" aria-busy="true" aria-label="題目產生中">
      <div className="skeleton__hud">
        <span className="skeleton__block skeleton__block--label" />
        <span className="skeleton__block skeleton__block--label" />
      </div>

      {/* FR-16.1：與實際盤面同尺寸同間距，切換時不位移 */}
      <div className="skeleton__board">
        {Array.from({ length: 81 }, (_, i) => (
          <span key={i} className="skeleton__block" />
        ))}
      </div>
    </div>
  )
}
