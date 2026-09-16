/**
 * 產題流程的主執行緒端：Worker 呼叫、最短載入時間、逾時重試、競態取消。
 * 對應規格 §10.1（FR-19.1 ~ FR-19.8）。
 */

import { generatePuzzle } from './logic'
import type { Difficulty, GeneratedPuzzle } from './logic'
import type { GenerateResponse } from './generator.worker'

/** skeleton 最短顯示時間，避免產題過快造成閃爍（FR-2.6、FR-19.8） */
const MIN_SKELETON_MS = 600
/** 單次產題逾時門檻（FR-19.7） */
const TIMEOUT_MS = 10_000
/** 連續失敗幾次後放棄（FR-19.7） */
const MAX_ATTEMPTS = 3

export interface PuzzleRequest {
  /** 取消這次產題並終止 Worker（FR-19.5） */
  cancel(): void
}

function createWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  try {
    return new Worker(new URL('./generator.worker.ts', import.meta.url), {
      type: 'module',
    })
  } catch {
    return null
  }
}

export function requestPuzzle(
  difficulty: Difficulty,
  onDone: (result: GeneratedPuzzle) => void,
  onError: (message: string) => void,
): PuzzleRequest {
  const startedAt = performance.now()
  let cancelled = false
  let attempt = 0
  let worker: Worker | null = null
  let timeoutId: number | undefined
  let delayId: number | undefined

  /** 補滿最短顯示時間後才交出結果 */
  const settle = (result: GeneratedPuzzle) => {
    const remaining = MIN_SKELETON_MS - (performance.now() - startedAt)
    if (remaining <= 0) {
      onDone(result)
      return
    }
    delayId = window.setTimeout(() => {
      if (!cancelled) onDone(result)
    }, remaining)
  }

  const disposeWorker = () => {
    worker?.terminate()
    worker = null
    window.clearTimeout(timeoutId)
  }

  const fail = (message: string) => {
    disposeWorker()
    if (cancelled) return
    if (attempt < MAX_ATTEMPTS) {
      run()
    } else {
      onError(message)
    }
  }

  function run() {
    attempt += 1
    worker = createWorker()

    // 不支援 Worker 時退回主執行緒同步產題（FR-19.6）
    if (!worker) {
      try {
        settle(generatePuzzle(difficulty))
      } catch (err) {
        onError(err instanceof Error ? err.message : '產題失敗')
      }
      return
    }

    timeoutId = window.setTimeout(() => fail('產題逾時'), TIMEOUT_MS)

    worker.onmessage = (event: MessageEvent<GenerateResponse>) => {
      if (cancelled) return
      const data = event.data
      if (data.type === 'error') {
        fail(data.message)
        return
      }
      disposeWorker()
      settle({
        puzzle: data.puzzle,
        solution: data.solution,
        givens: data.givens,
      })
    }

    worker.onerror = () => fail('產題失敗')
    worker.postMessage({ type: 'generate', difficulty })
  }

  run()

  return {
    cancel() {
      cancelled = true
      disposeWorker()
      window.clearTimeout(delayId)
    },
  }
}
