/** 9×9 盤面（§7.4、§9.3） */

import './Board.css'

export interface ErrorMark {
  index: number
  digit: number
  /** digit：先正常顯示填入的數字；mark：換成紅色 X */
  phase: 'digit' | 'mark'
}

interface Props {
  puzzle: number[]
  board: number[]
  selected: number | null
  error: ErrorMark | null
  interactive: boolean
  onSelect: (index: number, element: HTMLElement) => void
}

export function Board({
  puzzle,
  board,
  selected,
  error,
  interactive,
  onSelect,
}: Props) {
  return (
    <div className="board" role="grid" aria-label="數獨盤面">
      {board.map((value, index) => {
        const given = puzzle[index] !== 0
        const filled = !given && value !== 0
        // FR-7.7、FR-8.6：鎖定格與動畫中的格子不可選取
        const locked = given || filled || error?.index === index
        const showError = error?.index === index

        const classes = ['cell']
        if (given) classes.push('cell--given')
        if (filled) classes.push('cell--filled')
        if (selected === index) classes.push('cell--selected')
        if (showError) classes.push('cell--error')
        if (showError && error.phase === 'mark') classes.push('cell--error-mark')

        return (
          <button
            key={index}
            type="button"
            className={classes.join(' ')}
            aria-disabled={locked || !interactive}
            onClick={(event) => {
              if (!interactive || locked) return
              onSelect(index, event.currentTarget)
            }}
          >
            {showError
              ? error.phase === 'digit'
                ? error.digit
                : '✕'
              : value !== 0
                ? value
                : ''}
          </button>
        )
      })}
    </div>
  )
}
