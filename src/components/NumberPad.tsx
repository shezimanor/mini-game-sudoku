/**
 * 數字面板：答案面板與筆記面板共用同一個元件。
 * 對應 FR-7.2、FR-7.3、§7.9、§9.5、§9.10。
 */

import { forwardRef } from 'react'
import './NumberPad.css'

export type PadMode = 'answer' | 'note'

/** 3 × 44px 按鈕 + 2 × 8px 間距 + 2 × 4px 內距（FR-18.4） */
const PAD_WIDTH = 156
const CLEAR_HEIGHT = 44
const GAP = 8
/** 筆記面板多一列 clear 按鈕（FR-22.6） */
const padHeight = (mode: PadMode) =>
  mode === 'note' ? PAD_WIDTH + GAP + CLEAR_HEIGHT : PAD_WIDTH

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

interface Props {
  /** 被選取空格的視窗座標 */
  anchor: DOMRect
  mode: PadMode
  /** 筆記模式：該格目前已記下的數字 */
  notes: Set<number>
  onPick: (digit: number) => void
  onClear: () => void
}

/**
 * 依序嘗試下、上、右、左四個方位，取第一個完整落在可視範圍內的位置。
 * 四個方位都放不下時，退回下方並夾在視窗內（FR-7.3）。
 */
function place(anchor: DOMRect, height: number) {
  const { innerWidth: vw, innerHeight: vh } = window
  const clampX = (x: number) => Math.min(Math.max(GAP, x), vw - PAD_WIDTH - GAP)
  const clampY = (y: number) => Math.min(Math.max(GAP, y), vh - height - GAP)
  const centerX = clampX(anchor.left + anchor.width / 2 - PAD_WIDTH / 2)
  const centerY = clampY(anchor.top + anchor.height / 2 - height / 2)

  const candidates = [
    { top: anchor.bottom + GAP, left: centerX, from: 'below' },
    { top: anchor.top - height - GAP, left: centerX, from: 'above' },
    { top: centerY, left: anchor.right + GAP, from: 'right' },
    { top: centerY, left: anchor.left - PAD_WIDTH - GAP, from: 'left' },
  ] as const

  const fits = candidates.find(
    (c) =>
      c.top >= GAP &&
      c.top + height <= vh - GAP &&
      c.left >= GAP &&
      c.left + PAD_WIDTH <= vw - GAP,
  )

  return fits ?? { top: clampY(anchor.bottom + GAP), left: centerX, from: 'below' as const }
}

export const NumberPad = forwardRef<HTMLDivElement, Props>(function NumberPad(
  { anchor, mode, notes, onPick, onClear },
  ref,
) {
  const height = padHeight(mode)
  const { top, left, from } = place(anchor, height)
  const isNote = mode === 'note'

  return (
    <div
      ref={ref}
      className={`pad pad--${from} pad--${mode}`}
      style={{ top, left, width: PAD_WIDTH, height }}
      role="group"
      aria-label={isNote ? '筆記數字' : '選擇數字'}
      // 面板本身不該觸發格子的右鍵選單
      onContextMenu={(event) => event.preventDefault()}
    >
      {/* FR-21.6：1–9 全部可點，系統不替玩家排除任何候選數字 */}
      <div className="pad__keys">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            className={`pad__key${isNote && notes.has(digit) ? ' pad__key--active' : ''}`}
            aria-pressed={isNote ? notes.has(digit) : undefined}
            onClick={() => onPick(digit)}
          >
            {digit}
          </button>
        ))}
      </div>

      {/* FR-21.19、FR-21.20 */}
      {isNote && (
        <button
          type="button"
          className="pad__clear"
          aria-disabled={notes.size === 0}
          onClick={() => {
            if (notes.size === 0) return
            onClear()
          }}
        >
          clear
        </button>
      )}
    </div>
  )
})
