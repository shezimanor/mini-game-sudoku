/**
 * 產題 Web Worker（FR-19.1）。
 *
 * 困難難度需反覆呼叫解題器驗證唯一解，放在主執行緒會凍住畫面，
 * 連 skeleton 的 shimmer 都會停住，看起來像當機。
 */

import { generatePuzzle } from './logic'
import type { Difficulty } from './logic'

export interface GenerateRequest {
  type: 'generate'
  difficulty: Difficulty
}

export type GenerateResponse =
  | { type: 'result'; puzzle: number[]; solution: number[]; givens: number }
  | { type: 'error'; message: string }

/** DOM 與 WebWorker 兩組 lib 的型別會互相打架，這裡只取實際用到的成員 */
const ctx = self as unknown as {
  postMessage(message: GenerateResponse): void
  onmessage: ((event: MessageEvent<GenerateRequest>) => void) | null
}

ctx.onmessage = (event) => {
  if (event.data?.type !== 'generate') return

  try {
    const { puzzle, solution, givens } = generatePuzzle(event.data.difficulty)
    ctx.postMessage({ type: 'result', puzzle, solution, givens })
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : '產題失敗',
    })
  }
}
