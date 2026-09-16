/**
 * 數獨核心邏輯：產生正解、挖空、唯一解驗證。
 * 對應規格 §6.3（FR-3.1 ~ FR-3.7）。
 *
 * 盤面一律以長度 81 的一維陣列表示，0 代表空格。
 */

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface GeneratedPuzzle {
  /** 題目盤面，0 為空格 */
  puzzle: number[]
  /** 完整正解，供即時判定使用（FR-3.4） */
  solution: number[]
  /** 實際給定數字數量 */
  givens: number
}

/** 各難度的給定數字數量區間（FR-1.3） */
export const GIVENS_RANGE: Record<Difficulty, [number, number]> = {
  easy: [40, 45],
  medium: [32, 36],
  hard: [26, 30],
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '簡單',
  medium: '中等',
  hard: '困難',
}

const randInt = (max: number) => Math.floor(Math.random() * max)

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    const tmp = items[i]
    items[i] = items[j]
    items[j] = tmp
  }
  return items
}

/** 檢查在 index 填入 digit 是否違反列、行、宮的規則（FR-3.5） */
function isValid(board: number[], index: number, digit: number): boolean {
  const row = Math.floor(index / 9)
  const col = index % 9
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3

  for (let i = 0; i < 9; i++) {
    if (board[row * 9 + i] === digit) return false
    if (board[i * 9 + col] === digit) return false
    const r = boxRow + Math.floor(i / 3)
    const c = boxCol + (i % 3)
    if (board[r * 9 + c] === digit) return false
  }
  return true
}

/** 以回溯法 + 隨機候選順序填滿盤面，產生一份完整正解 */
function fillBoard(board: number[], pos = 0): boolean {
  if (pos === 81) return true
  if (board[pos] !== 0) return fillBoard(board, pos + 1)

  for (const digit of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (!isValid(board, pos, digit)) continue
    board[pos] = digit
    if (fillBoard(board, pos + 1)) return true
    board[pos] = 0
  }
  return false
}

/**
 * 計算解的數量，最多數到 limit 就提前結束。
 * 只需要區分「唯一解」與「多解」，所以 limit 固定為 2 即可。
 * 過程中會暫時改動 board，但結束時一定還原。
 */
function countSolutions(board: number[], limit = 2): number {
  const index = board.indexOf(0)
  if (index === -1) return 1

  let count = 0
  for (let digit = 1; digit <= 9; digit++) {
    if (!isValid(board, index, digit)) continue
    board[index] = digit
    count += countSolutions(board, limit - count)
    board[index] = 0
    if (count >= limit) break
  }
  return count
}

/**
 * 依難度產生一份唯一解數獨題目。
 *
 * 流程：產生完整正解 → 以隨機順序逐格挖空 → 每挖一格驗證是否仍為唯一解，
 * 不是就還原該格（FR-3.2、FR-3.3）。
 */
export function generatePuzzle(difficulty: Difficulty): GeneratedPuzzle {
  const solution = new Array<number>(81).fill(0)
  fillBoard(solution)

  const puzzle = solution.slice()
  const [min, max] = GIVENS_RANGE[difficulty]
  const target = min + randInt(max - min + 1)

  let givens = 81
  for (const index of shuffle([...Array(81).keys()])) {
    if (givens <= target) break

    const backup = puzzle[index]
    puzzle[index] = 0
    if (countSolutions(puzzle) === 1) {
      givens--
    } else {
      // 挖掉這格會產生多解，還原
      puzzle[index] = backup
    }
  }

  // 若無法挖到目標數量，以當下可達的結果為準，不犧牲唯一解（FR-3.7）
  return { puzzle, solution, givens }
}
