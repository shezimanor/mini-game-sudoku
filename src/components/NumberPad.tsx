/** 數字面板：3×3 的 1–9 按鈕，依邊緣判斷擺放（FR-7.2、FR-7.3、§9.5） */

import { forwardRef } from 'react'
import './NumberPad.css'

/** 面板為正方形：3 × 44px 按鈕 + 2 × 8px 間距 + 2 × 4px 內距 = 156px（FR-18.4） */
export const PAD_SIZE = 156
const GAP = 8

interface Props {
  /** 被選取空格的視窗座標 */
  anchor: DOMRect
  onPick: (digit: number) => void
}

/**
 * 依序嘗試下、上、右、左四個方位，取第一個完整落在可視範圍內的位置。
 * 四個方位都放不下時，退回下方並夾在視窗內（FR-7.3）。
 */
function place(anchor: DOMRect) {
  const { innerWidth: vw, innerHeight: vh } = window
  const clampX = (x: number) => Math.min(Math.max(GAP, x), vw - PAD_SIZE - GAP)
  const clampY = (y: number) => Math.min(Math.max(GAP, y), vh - PAD_SIZE - GAP)
  const centerX = clampX(anchor.left + anchor.width / 2 - PAD_SIZE / 2)
  const centerY = clampY(anchor.top + anchor.height / 2 - PAD_SIZE / 2)

  const candidates = [
    { top: anchor.bottom + GAP, left: centerX, from: 'below' },
    { top: anchor.top - PAD_SIZE - GAP, left: centerX, from: 'above' },
    { top: centerY, left: anchor.right + GAP, from: 'right' },
    { top: centerY, left: anchor.left - PAD_SIZE - GAP, from: 'left' },
  ] as const

  const fits = candidates.find(
    (c) =>
      c.top >= GAP &&
      c.top + PAD_SIZE <= vh - GAP &&
      c.left >= GAP &&
      c.left + PAD_SIZE <= vw - GAP,
  )

  return fits ?? { top: clampY(anchor.bottom + GAP), left: centerX, from: 'below' as const }
}

export const NumberPad = forwardRef<HTMLDivElement, Props>(function NumberPad(
  { anchor, onPick },
  ref,
) {
  const { top, left, from } = place(anchor)

  return (
    <div
      ref={ref}
      className={`pad pad--${from}`}
      style={{ top, left, width: PAD_SIZE, height: PAD_SIZE }}
      role="group"
      aria-label="選擇數字"
    >
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
        <button
          key={digit}
          type="button"
          className="pad__key"
          onClick={() => onPick(digit)}
        >
          {digit}
        </button>
      ))}
    </div>
  )
})
