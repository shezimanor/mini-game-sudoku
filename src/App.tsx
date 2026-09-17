import { useCallback, useEffect, useRef, useState } from 'react'
import { DIFFICULTY_LABEL } from './sudoku/logic'
import type { Difficulty } from './sudoku/logic'
import { peerIndices, usedDigits } from './sudoku/peers'
import { requestPuzzle } from './sudoku/requestPuzzle'
import type { PuzzleRequest } from './sudoku/requestPuzzle'
import { formatTime, useTimer } from './hooks/useTimer'
import { ERROR_MARK_DELAY_MS, ERROR_TOTAL_MS, MAX_MISTAKES } from './constants'
import { Board } from './components/Board'
import type { ErrorMark } from './components/Board'
import { Hud } from './components/Hud'
import { Modal } from './components/Modal'
import type { ModalAction } from './components/Modal'
import { NumberPad } from './components/NumberPad'
import type { PadMode } from './components/NumberPad'
import { Skeleton } from './components/Skeleton'

/** §4.3 狀態模型 */
type Status =
  | 'idle'
  | 'generating'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'gameOver'
  | 'error'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

/** 被開啟的數字面板：目標空格、錨點座標、面板種類 */
interface Pad {
  index: number
  rect: DOMRect
  mode: PadMode
}

const emptyNotes = () => Array.from({ length: 81 }, () => new Set<number>())

export default function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [puzzle, setPuzzle] = useState<number[]>([])
  const [solution, setSolution] = useState<number[]>([])
  const [board, setBoard] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [pad, setPad] = useState<Pad | null>(null)
  const [notes, setNotes] = useState<Set<number>[]>(emptyNotes)
  const [error, setError] = useState<ErrorMark | null>(null)

  const { elapsed, reset: resetTimer } = useTimer(status === 'playing')

  const requestRef = useRef<PuzzleRequest | null>(null)
  const timersRef = useRef<number[]>([])
  const padRef = useRef<HTMLDivElement>(null)
  /** 錯誤動畫的兩段 timeout 需要即時的答錯次數，state 更新有延遲 */
  const mistakesRef = useRef(0)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout)
    timersRef.current = []
  }, [])

  const closePad = useCallback(() => setPad(null), [])

  /** 清掉一局的暫時狀態，但不動題目本身 */
  const resetRound = useCallback(() => {
    clearTimers()
    closePad()
    setError(null)
    setNotes(emptyNotes())
    mistakesRef.current = 0
    setMistakes(0)
    resetTimer()
  }, [clearTimers, closePad, resetTimer])

  const startGame = useCallback(
    (next: Difficulty) => {
      // FR-19.5：先取消尚未完成的產題，避免過期結果套到新的一局
      requestRef.current?.cancel()
      resetRound()
      setDifficulty(next)
      setStatus('generating')

      requestRef.current = requestPuzzle(
        next,
        ({ puzzle: generated, solution: answer }) => {
          setPuzzle(generated)
          setSolution(answer)
          setBoard(generated.slice())
          resetTimer()
          setStatus('playing')
        },
        // FR-20.1：連續失敗後導向錯誤彈窗
        () => setStatus('error'),
      )
    },
    [resetRound, resetTimer],
  )

  useEffect(() => {
    return () => {
      requestRef.current?.cancel()
      timersRef.current.forEach(window.clearTimeout)
    }
  }, [])

  /** 同一題重玩（FR-0.6） */
  const restart = useCallback(() => {
    resetRound()
    setBoard(puzzle.slice())
    setStatus('playing')
  }, [puzzle, resetRound])

  /** 回到開始畫面（FR-0.6） */
  const backToStart = useCallback(() => {
    requestRef.current?.cancel()
    resetRound()
    setStatus('idle')
  }, [resetRound])

  /** FR-21.10：切換一個筆記，面板保持開啟 */
  const toggleNote = useCallback((index: number, digit: number) => {
    setNotes((current) => {
      const next = current.slice()
      const cell = new Set(next[index])
      if (cell.has(digit)) cell.delete(digit)
      else cell.add(digit)
      next[index] = cell
      return next
    })
  }, [])

  /** FR-21.19：清空該格所有筆記 */
  const clearNotes = useCallback((index: number) => {
    setNotes((current) => {
      const next = current.slice()
      next[index] = new Set()
      return next
    })
  }, [])

  const fill = useCallback(
    (digit: number) => {
      if (status !== 'playing' || !pad || error) return

      const index = pad.index
      closePad()

      // FR-8.1：以正解為基準判定，而非只檢查是否違反數獨規則
      if (digit === solution[index]) {
        const next = board.slice()
        next[index] = digit
        setBoard(next)

        // FR-21.15：確定答案後清掉該格的筆記，並移除關聯格中相同的筆記
        setNotes((current) => {
          const updated = current.slice()
          updated[index] = new Set()
          for (const peer of peerIndices(index)) {
            if (!updated[peer].has(digit)) continue
            const cell = new Set(updated[peer])
            cell.delete(digit)
            updated[peer] = cell
          }
          return updated
        })

        if (next.every((value) => value !== 0)) setStatus('completed')
        return
      }

      // FR-8.4：先正常顯示數字，0.3s 後換成紅色 X，總長 1.2s
      setError({ index, digit, phase: 'digit' })

      timersRef.current.push(
        window.setTimeout(() => {
          setError((current) => (current ? { ...current, phase: 'mark' } : null))
          // FR-8.5：扣除次數與紅色 X 出現同步
          mistakesRef.current += 1
          setMistakes(mistakesRef.current)
        }, ERROR_MARK_DELAY_MS),
        window.setTimeout(() => {
          setError(null)
          // FR-8.7：第三次錯誤要等動畫播完才顯示失敗彈窗
          if (mistakesRef.current >= MAX_MISTAKES) setStatus('gameOver')
        }, ERROR_TOTAL_MS),
      )
    },
    [board, closePad, error, pad, solution, status],
  )

  /** 依面板種類決定點擊數字的效果 */
  const handlePick = useCallback(
    (digit: number) => {
      if (!pad) return
      if (pad.mode === 'answer') {
        fill(digit)
        return
      }
      // FR-21.11：被關聯格排除的數字按下去無作用
      if (usedDigits(board, pad.index).has(digit)) return
      toggleNote(pad.index, digit)
    },
    [board, fill, pad, toggleNote],
  )

  /** FR-7.4.2：點擊目標空格與面板以外的地方就關閉面板 */
  useEffect(() => {
    if (!pad) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (padRef.current?.contains(target)) return
      // 點到可選取的格子時交給格子自己處理（切換面板）；
      // 鎖定格不會有任何動作，視同點在面板外，這裡直接關閉（FR-7.4.2）
      const cell = target.closest('.cell')
      if (cell && cell.getAttribute('aria-disabled') !== 'true') return
      closePad()
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [closePad, pad])

  /** FR-7.5、FR-21.21 ~ FR-21.25：面板開啟時才接受鍵盤操作 */
  useEffect(() => {
    if (!pad || status !== 'playing') return

    const onKeyDown = (event: KeyboardEvent) => {
      const { key } = event

      if (key >= '1' && key <= '9') {
        event.preventDefault()
        handlePick(Number(key))
        return
      }

      // N：在答案面板與筆記面板之間切換，目標空格不變
      if (key === 'n' || key === 'N') {
        event.preventDefault()
        setPad((current) =>
          current
            ? { ...current, mode: current.mode === 'answer' ? 'note' : 'answer' }
            : null,
        )
        return
      }

      if (pad.mode === 'note' && (key === 'Backspace' || key === 'Delete')) {
        event.preventDefault()
        clearNotes(pad.index)
        return
      }

      if (key === 'Escape') {
        event.preventDefault()
        closePad()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clearNotes, closePad, handlePick, pad, status])

  /** 視窗尺寸改變後原本的錨點就失效了，直接關閉面板 */
  useEffect(() => {
    if (!pad) return
    window.addEventListener('resize', closePad)
    return () => window.removeEventListener('resize', closePad)
  }, [closePad, pad])

  const modal = buildModal()

  return (
    <>
      {status === 'generating' ? (
        <Skeleton />
      ) : status === 'idle' || status === 'error' ? null : (
        <main className="game">
          <Hud
            difficulty={difficulty}
            elapsed={elapsed}
            mistakes={mistakes}
            canPause={status === 'playing' && !error}
            onPause={() => {
              // FR-6.2：暫停時一併關閉數字面板
              closePad()
              setStatus('paused')
            }}
          />

          <Board
            puzzle={puzzle}
            board={board}
            notes={notes}
            selected={pad?.index ?? null}
            error={error}
            interactive={status === 'playing'}
            onSelect={(index, element) => {
              // FR-7.4a：開啟答案面板時，原本的筆記面板一併被取代
              setPad({ index, rect: element.getBoundingClientRect(), mode: 'answer' })
            }}
            onNoteRequest={(index, element) => {
              setPad({ index, rect: element.getBoundingClientRect(), mode: 'note' })
            }}
          />
        </main>
      )}

      {pad && status === 'playing' && (
        <NumberPad
          ref={padRef}
          anchor={pad.rect}
          mode={pad.mode}
          notes={notes[pad.index]}
          disabled={usedDigits(board, pad.index)}
          onPick={handlePick}
          onClear={() => clearNotes(pad.index)}
        />
      )}

      {modal}
    </>
  )

  function buildModal() {
    const replay: ModalAction = { label: '重新開始', onClick: restart }
    const reselect: ModalAction = { label: '重選難度', onClick: backToStart }

    if (status === 'idle') {
      return (
        <Modal
          title="Welcome Sudoku"
          actions={DIFFICULTIES.map((value) => ({
            label: DIFFICULTY_LABEL[value],
            variant: 'primary' as const,
            onClick: () => startGame(value),
          }))}
        />
      )
    }

    // FR-20.2：只有標題與一個按鈕，不顯示額外說明文字
    if (status === 'error') {
      return (
        <Modal
          title="Error"
          tone="danger"
          actions={[{ label: '我知道了', variant: 'primary', onClick: backToStart }]}
        />
      )
    }

    if (status === 'paused') {
      return (
        <Modal
          title="Menu"
          actions={[
            { label: '繼續遊戲', variant: 'primary', onClick: () => setStatus('playing') },
            replay,
            reselect,
          ]}
        />
      )
    }

    if (status === 'completed') {
      return (
        <Modal
          title="Congratulations!"
          actions={[
            { label: '另開新局', onClick: () => startGame(difficulty) },
            reselect,
          ]}
        >
          <span className="modal__time">{formatTime(elapsed)}</span>
        </Modal>
      )
    }

    if (status === 'gameOver') {
      // FR-9.5、FR-9.6：不顯示已用時間，也不顯示正解
      return <Modal title="Oops!" tone="danger" actions={[replay, reselect]} />
    }

    return null
  }
}
