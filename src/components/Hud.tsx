/** 遊戲資訊列：難度、計時器、剩餘答錯次數、暫停鍵（§7.1、§9.4） */

import { DIFFICULTY_LABEL } from '../sudoku/logic'
import type { Difficulty } from '../sudoku/logic'
import { formatTime } from '../hooks/useTimer'
import { MAX_MISTAKES } from '../constants'
import './Hud.css'

interface Props {
  difficulty: Difficulty
  elapsed: number
  mistakes: number
  canPause: boolean
  onPause: () => void
}

export function Hud({ difficulty, elapsed, mistakes, canPause, onPause }: Props) {
  const remaining = MAX_MISTAKES - mistakes

  return (
    <header className="hud">
      <div className="hud__left">
        <span className="hud__difficulty">{DIFFICULTY_LABEL[difficulty]}</span>
        <span className="hud__timer">{formatTime(elapsed)}</span>
      </div>

      <div className="hud__right">
        {/* FR-13.3：以 3 個點呈現，剩 1 次時整組轉為警示色 */}
        <div
          className={`hud__dots${remaining === 1 ? ' hud__dots--critical' : ''}`}
          role="img"
          aria-label={`剩餘機會 ${remaining} 次`}
        >
          {Array.from({ length: MAX_MISTAKES }, (_, i) => (
            <span
              key={i}
              className={`hud__dot${i < mistakes ? ' hud__dot--used' : ''}`}
            />
          ))}
        </div>

        <button
          type="button"
          className="hud__pause"
          onClick={onPause}
          disabled={!canPause}
          aria-label="暫停"
        >
          {/* FR-13.4：暫停符號以 CSS 繪製，不使用圖檔 */}
          <span className="hud__pause-bar" />
          <span className="hud__pause-bar" />
        </button>
      </div>
    </header>
  )
}
