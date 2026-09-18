import { describe, expect, it } from 'vitest'
import {
  GIVENS_RANGE,
  countSolutions,
  fillBoard,
  generatePuzzle,
  isValid,
} from './logic'
import type { Difficulty } from './logic'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

/** 產題是隨機演算法，單次通過不代表沒問題，每個難度重複這麼多輪 */
const ROUNDS = 5

const emptyBoard = () => new Array<number>(81).fill(0)

const rowOf = (index: number) => Math.floor(index / 9)
const colOf = (index: number) => index % 9
const boxOf = (index: number) =>
  Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3)

/**
 * 獨立於 logic.ts 的完整性檢查：把 81 格依列、行、宮分組，
 * 每組都必須剛好是 1–9 各一次。
 */
function findCompletionFlaw(board: number[]): string | null {
  if (board.length !== 81) return `盤面長度為 ${board.length}`

  const groups = {
    列: rowOf,
    行: colOf,
    宮: boxOf,
  }

  for (const [label, groupOf] of Object.entries(groups)) {
    for (let group = 0; group < 9; group++) {
      const digits = board.filter((_, index) => groupOf(index) === group).sort()
      const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      if (digits.join() !== expected.join()) {
        return `第 ${group + 1} ${label}為 [${digits.join(',')}]`
      }
    }
  }
  return null
}

/**
 * 獨立於 logic.ts 的解數計算，刻意用不同的策略（每次挑候選數最少的空格），
 * 避免拿被測程式自己驗證自己。最多數到 limit 就停。
 */
function countSolutionsIndependently(board: number[], limit = 2): number {
  const candidatesAt = (grid: number[], index: number) => {
    const taken = new Set<number>()
    for (let i = 0; i < 81; i++) {
      if (i === index || grid[i] === 0) continue
      if (
        rowOf(i) === rowOf(index) ||
        colOf(i) === colOf(index) ||
        boxOf(i) === boxOf(index)
      ) {
        taken.add(grid[i])
      }
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((digit) => !taken.has(digit))
  }

  const search = (grid: number[]): number => {
    let target = -1
    let best: number[] = []

    for (let i = 0; i < 81; i++) {
      if (grid[i] !== 0) continue
      const candidates = candidatesAt(grid, i)
      if (target === -1 || candidates.length < best.length) {
        target = i
        best = candidates
      }
      if (best.length === 0) break
    }

    if (target === -1) return 1

    let found = 0
    for (const digit of best) {
      grid[target] = digit
      found += search(grid)
      grid[target] = 0
      if (found >= limit) break
    }
    return found
  }

  return search(board.slice())
}

describe('generatePuzzle', () => {
  const samples = DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: ROUNDS }, () => ({
      difficulty,
      result: generatePuzzle(difficulty),
    })),
  )

  it.each(DIFFICULTIES)('%s：solution 是合法的完整解', (difficulty) => {
    for (const { result } of samples.filter((s) => s.difficulty === difficulty)) {
      expect(findCompletionFlaw(result.solution)).toBeNull()
    }
  })

  it('puzzle 的每個給定數字都與 solution 同位置一致', () => {
    for (const { result } of samples) {
      for (let i = 0; i < 81; i++) {
        if (result.puzzle[i] === 0) continue
        expect(result.puzzle[i]).toBe(result.solution[i])
      }
    }
  })

  it('puzzle 只有唯一解（FR-3.3）', () => {
    for (const { result } of samples) {
      expect(countSolutionsIndependently(result.puzzle)).toBe(1)
    }
  })

  it('唯一解就是回傳的 solution', () => {
    for (const { result } of samples) {
      const solved = result.puzzle.slice()
      fillBoard(solved)
      expect(solved).toEqual(result.solution)
    }
  })

  it('givens 等於 puzzle 中非空格的數量', () => {
    for (const { result } of samples) {
      const filled = result.puzzle.filter((value) => value !== 0).length
      expect(result.givens).toBe(filled)
    }
  })

  it.each(DIFFICULTIES)('%s 的給定數字落在規格區間內（FR-1.3）', (difficulty) => {
    const [min, max] = GIVENS_RANGE[difficulty]
    for (const { result } of samples.filter((s) => s.difficulty === difficulty)) {
      expect(result.givens).toBeGreaterThanOrEqual(min)
      expect(result.givens).toBeLessThanOrEqual(max)
    }
  })

  it('難度越高給定數字越少', () => {
    const average = (difficulty: Difficulty) => {
      const values = samples
        .filter((s) => s.difficulty === difficulty)
        .map((s) => s.result.givens)
      return values.reduce((sum, value) => sum + value, 0) / values.length
    }

    expect(average('easy')).toBeGreaterThan(average('medium'))
    expect(average('medium')).toBeGreaterThan(average('hard'))
  })

  it('每次產生的題目都不同（FR-3.6）', () => {
    const puzzles = samples.map((s) => s.result.puzzle.join())
    expect(new Set(puzzles).size).toBe(puzzles.length)
  })
})

describe('isValid', () => {
  it('同列已有該數字時為 false', () => {
    const board = emptyBoard()
    board[0] = 5
    expect(isValid(board, 8, 5)).toBe(false)
  })

  it('同行已有該數字時為 false', () => {
    const board = emptyBoard()
    board[0] = 5
    expect(isValid(board, 72, 5)).toBe(false)
  })

  it('同宮已有該數字時為 false', () => {
    const board = emptyBoard()
    board[0] = 5
    // index 10 與 index 0 同宮，但不同列也不同行
    expect(rowOf(10)).not.toBe(rowOf(0))
    expect(colOf(10)).not.toBe(colOf(0))
    expect(isValid(board, 10, 5)).toBe(false)
  })

  it('三種關聯都沒有該數字時為 true', () => {
    const board = emptyBoard()
    board[0] = 5
    expect(isValid(board, 80, 5)).toBe(true)
  })

  it('不修改傳入的盤面', () => {
    const board = emptyBoard()
    board[0] = 5
    const before = board.slice()
    isValid(board, 40, 7)
    expect(board).toEqual(before)
  })
})

describe('fillBoard', () => {
  it('空盤面可以填成合法的完整解', () => {
    const board = emptyBoard()
    expect(fillBoard(board)).toBe(true)
    expect(findCompletionFlaw(board)).toBeNull()
  })

  it('保留既有的給定數字', () => {
    const board = emptyBoard()
    board[0] = 7
    board[40] = 3
    expect(fillBoard(board)).toBe(true)
    expect(board[0]).toBe(7)
    expect(board[40]).toBe(3)
  })

  it('有空格無解可填時回傳 false', () => {
    const board = emptyBoard()
    // 第 1 列放滿 1–8，唯一能填進第 9 格的只有 9；
    // 再把 9 放進同一行的其他列，該格就無解了
    for (let i = 0; i < 8; i++) board[i] = i + 1
    board[17] = 9
    expect(colOf(17)).toBe(colOf(8))
    expect(fillBoard(board)).toBe(false)
  })
})

describe('countSolutions', () => {
  it('完整盤面回傳 1', () => {
    const board = emptyBoard()
    fillBoard(board)
    expect(countSolutions(board)).toBe(1)
  })

  it('只缺一格時回傳 1', () => {
    const board = emptyBoard()
    fillBoard(board)
    board[40] = 0
    expect(countSolutions(board)).toBe(1)
  })

  it('多解時提前停在 limit（預設 2）', () => {
    const board = emptyBoard()
    fillBoard(board)
    // 挖掉所有的 1 和 2：把兩者對調後仍是一組合法解，
    // 所以這個盤面必定至少有兩組解，與隨機產生的盤面長相無關
    const dug = board.map((value) => (value === 1 || value === 2 ? 0 : value))
    expect(countSolutions(dug)).toBe(2)
  })

  it('無解時回傳 0', () => {
    const board = emptyBoard()
    for (let i = 0; i < 8; i++) board[i] = i + 1
    board[17] = 9
    expect(countSolutions(board)).toBe(0)
  })

  it('結束後還原盤面', () => {
    const board = emptyBoard()
    fillBoard(board)
    board[3] = 0
    board[30] = 0
    const before = board.slice()
    countSolutions(board)
    expect(board).toEqual(before)
  })

  it('limit 可以調整上限', () => {
    const board = emptyBoard()
    expect(countSolutions(board, 1)).toBe(1)
    expect(countSolutions(board, 3)).toBe(3)
  })
})
