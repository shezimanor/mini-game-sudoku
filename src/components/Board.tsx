/** 9×9 盤面（§7.4、§7.9、§9.3、§9.10） */

import { useRef, useState } from 'react'
import './Board.css'

export interface ErrorMark {
  index: number
  digit: number
  /** digit：先正常顯示填入的數字；mark：換成紅色 X */
  phase: 'digit' | 'mark'
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

interface Props {
  puzzle: number[]
  board: number[]
  notes: Set<number>[]
  selected: number | null
  error: ErrorMark | null
  interactive: boolean
  onSelect: (index: number, element: HTMLElement) => void
  onNoteRequest: (index: number, element: HTMLElement) => void
}

export function Board({
  puzzle,
  board,
  notes,
  selected,
  error,
  interactive,
  onSelect,
  onNoteRequest,
}: Props) {
  /** 長按判定（FR-21.3）：500ms 觸發，移動超過 10px 取消，觸發後抑制隨之而來的 click */
  const pressTimer = useRef<number>(undefined)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)
  const longPressed = useRef(false)

  /** FR-23.1：游標所在的格子，用來高亮整列與整行 */
  const [hovered, setHovered] = useState<number | null>(null)

  const cancelPress = () => {
    window.clearTimeout(pressTimer.current)
    pressTimer.current = undefined
    pressOrigin.current = null
  }

  return (
    <div
      className="board"
      role="grid"
      aria-label="數獨盤面"
      onPointerLeave={() => setHovered(null)}
    >
      {board.map((value, index) => {
        const given = puzzle[index] !== 0
        const filled = !given && value !== 0
        // FR-7.7、FR-8.6：鎖定格與動畫中的格子不可選取
        const locked = given || filled || error?.index === index
        const showError = error?.index === index
        const cellNotes = notes[index]

        // FR-23.5：只看同列與同行，不含同宮
        const crossed =
          hovered !== null &&
          hovered !== index &&
          (Math.floor(hovered / 9) === Math.floor(index / 9) || hovered % 9 === index % 9)

        const classes = ['cell']
        if (crossed) classes.push('cell--crossed')
        if (hovered === index) classes.push('cell--hovered')
        if (given) classes.push('cell--given')
        if (filled) classes.push('cell--filled')
        if (selected === index) classes.push('cell--selected')
        if (showError) classes.push('cell--error')
        if (showError && error.phase === 'mark') classes.push('cell--error-mark')

        const openNotePad = (element: HTMLElement) => {
          if (!interactive || locked) return
          onNoteRequest(index, element)
        }

        return (
          <button
            key={index}
            type="button"
            className={classes.join(' ')}
            aria-disabled={locked || !interactive}
            tabIndex={locked || !interactive ? -1 : 0}
            onClick={(event) => {
              if (longPressed.current) {
                longPressed.current = false
                return
              }
              if (!interactive || locked) return
              onSelect(index, event.currentTarget)
            }}
            // FR-21.1、FR-21.2：右鍵開筆記面板並擋掉瀏覽器選單
            onContextMenu={(event) => {
              event.preventDefault()
              openNotePad(event.currentTarget)
            }}
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse') return
              const element = event.currentTarget
              longPressed.current = false
              pressOrigin.current = { x: event.clientX, y: event.clientY }
              pressTimer.current = window.setTimeout(() => {
                longPressed.current = true
                cancelPress()
                openNotePad(element)
              }, 500)
            }}
            onPointerMove={(event) => {
              const origin = pressOrigin.current
              if (!origin) return
              const moved =
                Math.abs(event.clientX - origin.x) > 10 ||
                Math.abs(event.clientY - origin.y) > 10
              if (moved) cancelPress()
            }}
            onPointerUp={cancelPress}
            onPointerCancel={cancelPress}
            // FR-23.2：只有指標裝置才有 hover，觸控不套用
            onPointerEnter={(event) => {
              if (event.pointerType !== 'mouse') return
              setHovered(index)
            }}
          >
            {showError ? (
              // FR-8.8：錯誤動畫期間隱藏筆記，避免與紅色 X 互相干擾
              error.phase === 'digit' ? (
                error.digit
              ) : (
                '✕'
              )
            ) : value !== 0 ? (
              value
            ) : cellNotes.size > 0 ? (
              // FR-21.13：筆記依數字本身固定落在 3×3 的位置
              <span className="cell__notes">
                {DIGITS.map((digit) => (
                  <span key={digit} className="cell__note">
                    {cellNotes.has(digit) ? digit : ''}
                  </span>
                ))}
              </span>
            ) : (
              ''
            )}
          </button>
        )
      })}
    </div>
  )
}
