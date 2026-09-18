import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_ATTEMPTS,
  MIN_SKELETON_MS,
  TIMEOUT_MS,
  requestPuzzle,
} from './requestPuzzle'
import type { GenerateResponse } from './generator.worker'

/**
 * 只實作 requestPuzzle 真正用到的 Worker 介面，
 * 並記錄收到的訊息與 terminate 次數供測試斷言。
 */
class FakeWorker {
  static instances: FakeWorker[] = []

  onmessage: ((event: MessageEvent<GenerateResponse>) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  readonly posted: unknown[] = []
  terminated = 0

  constructor() {
    FakeWorker.instances.push(this)
  }

  postMessage(message: unknown) {
    this.posted.push(message)
  }

  terminate() {
    this.terminated += 1
  }

  /** 模擬 Worker 回傳結果 */
  reply(response: GenerateResponse) {
    this.onmessage?.({ data: response } as MessageEvent<GenerateResponse>)
  }

  fail() {
    this.onerror?.(new Error('boom'))
  }
}

const asWorker = (fake: FakeWorker) => fake as unknown as Worker

const workerFactory = () => asWorker(new FakeWorker())
const noWorkerFactory = () => null

const result = (givens = 40): Extract<GenerateResponse, { type: 'result' }> => ({
  type: 'result',
  puzzle: new Array<number>(81).fill(0).map((_, i) => (i < givens ? 1 : 0)),
  solution: new Array<number>(81).fill(1),
  givens,
})

const latest = () => FakeWorker.instances[FakeWorker.instances.length - 1]

beforeEach(() => {
  FakeWorker.instances = []
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('requestPuzzle', () => {
  describe('最短載入時間（FR-2.6、FR-19.8）', () => {
    it('Worker 立刻回傳時仍等滿 600ms 才交出結果', () => {
      const onDone = vi.fn()
      requestPuzzle('easy', onDone, vi.fn(), workerFactory)

      latest().reply(result())
      expect(onDone).not.toHaveBeenCalled()

      vi.advanceTimersByTime(MIN_SKELETON_MS - 1)
      expect(onDone).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(onDone).toHaveBeenCalledTimes(1)
    })

    it('產題超過 600ms 時不再額外延遲', () => {
      const onDone = vi.fn()
      requestPuzzle('hard', onDone, vi.fn(), workerFactory)

      vi.advanceTimersByTime(MIN_SKELETON_MS + 100)
      latest().reply(result(26))
      expect(onDone).toHaveBeenCalledTimes(1)
    })

    it('交出的結果就是 Worker 回傳的內容', () => {
      const onDone = vi.fn()
      const payload = result(33)
      requestPuzzle('medium', onDone, vi.fn(), workerFactory)

      latest().reply(payload)
      vi.advanceTimersByTime(MIN_SKELETON_MS)

      expect(onDone).toHaveBeenCalledWith({
        puzzle: payload.puzzle,
        solution: payload.solution,
        givens: payload.givens,
      })
    })

    it('把難度傳給 Worker', () => {
      requestPuzzle('hard', vi.fn(), vi.fn(), workerFactory)
      expect(latest().posted).toEqual([{ type: 'generate', difficulty: 'hard' }])
    })
  })

  describe('逾時與重試（FR-19.7）', () => {
    it('逾時後會終止該 Worker 並重新產題', () => {
      requestPuzzle('hard', vi.fn(), vi.fn(), workerFactory)
      const first = latest()

      vi.advanceTimersByTime(TIMEOUT_MS)

      expect(first.terminated).toBe(1)
      expect(FakeWorker.instances).toHaveLength(2)
    })

    it('連續失敗滿 3 次才回報錯誤', () => {
      const onError = vi.fn()
      requestPuzzle('hard', vi.fn(), onError, workerFactory)

      vi.advanceTimersByTime(TIMEOUT_MS)
      expect(onError).not.toHaveBeenCalled()
      vi.advanceTimersByTime(TIMEOUT_MS)
      expect(onError).not.toHaveBeenCalled()

      vi.advanceTimersByTime(TIMEOUT_MS)
      expect(onError).toHaveBeenCalledTimes(1)
      expect(FakeWorker.instances).toHaveLength(MAX_ATTEMPTS)
    })

    it('中途成功就不再重試', () => {
      const onDone = vi.fn()
      const onError = vi.fn()
      requestPuzzle('hard', onDone, onError, workerFactory)

      vi.advanceTimersByTime(TIMEOUT_MS)
      expect(FakeWorker.instances).toHaveLength(2)

      latest().reply(result())
      vi.advanceTimersByTime(MIN_SKELETON_MS)

      expect(onDone).toHaveBeenCalledTimes(1)
      expect(onError).not.toHaveBeenCalled()
      expect(FakeWorker.instances).toHaveLength(2)
    })

    it('Worker 回報 error 訊息也算一次失敗', () => {
      const onError = vi.fn()
      requestPuzzle('easy', vi.fn(), onError, workerFactory)

      latest().reply({ type: 'error', message: '爆炸' })
      expect(FakeWorker.instances).toHaveLength(2)

      latest().reply({ type: 'error', message: '爆炸' })
      latest().reply({ type: 'error', message: '爆炸' })

      expect(onError).toHaveBeenCalledWith('爆炸')
    })

    it('Worker 觸發 onerror 也算一次失敗', () => {
      const onError = vi.fn()
      requestPuzzle('easy', vi.fn(), onError, workerFactory)

      latest().fail()
      expect(FakeWorker.instances).toHaveLength(2)
      latest().fail()
      latest().fail()

      expect(onError).toHaveBeenCalledTimes(1)
    })

    it('成功之後不會再被逾時計時器打斷', () => {
      const onDone = vi.fn()
      const onError = vi.fn()
      requestPuzzle('easy', onDone, onError, workerFactory)

      latest().reply(result())
      vi.advanceTimersByTime(TIMEOUT_MS * 2)

      expect(onDone).toHaveBeenCalledTimes(1)
      expect(onError).not.toHaveBeenCalled()
      expect(FakeWorker.instances).toHaveLength(1)
    })
  })

  describe('取消（FR-19.5）', () => {
    it('cancel 會終止 Worker', () => {
      const request = requestPuzzle('easy', vi.fn(), vi.fn(), workerFactory)
      request.cancel()
      expect(latest().terminated).toBe(1)
    })

    it('取消後即使 Worker 回傳結果也不交出', () => {
      const onDone = vi.fn()
      const request = requestPuzzle('easy', onDone, vi.fn(), workerFactory)
      const worker = latest()

      request.cancel()
      worker.reply(result())
      vi.advanceTimersByTime(MIN_SKELETON_MS * 2)

      expect(onDone).not.toHaveBeenCalled()
    })

    it('已經超過最短載入時間才取消，之後才到的結果一樣不交出', () => {
      // 這條走的是 settle 內「不需要再等」的分支，
      // 少了 onmessage 的取消檢查就會漏交出結果
      const onDone = vi.fn()
      const request = requestPuzzle('easy', onDone, vi.fn(), workerFactory)
      const worker = latest()

      vi.advanceTimersByTime(MIN_SKELETON_MS + 100)
      request.cancel()
      worker.reply(result())

      expect(onDone).not.toHaveBeenCalled()
    })

    it('在等待最短載入時間的期間取消，不會交出結果', () => {
      const onDone = vi.fn()
      const request = requestPuzzle('easy', onDone, vi.fn(), workerFactory)

      latest().reply(result())
      vi.advanceTimersByTime(MIN_SKELETON_MS - 100)
      request.cancel()
      vi.advanceTimersByTime(MIN_SKELETON_MS)

      expect(onDone).not.toHaveBeenCalled()
    })

    it('取消後逾時不會觸發重試或錯誤', () => {
      const onError = vi.fn()
      const request = requestPuzzle('hard', vi.fn(), onError, workerFactory)

      request.cancel()
      vi.advanceTimersByTime(TIMEOUT_MS * (MAX_ATTEMPTS + 1))

      expect(onError).not.toHaveBeenCalled()
      expect(FakeWorker.instances).toHaveLength(1)
    })

    it('重複呼叫 cancel 不會出錯', () => {
      const request = requestPuzzle('easy', vi.fn(), vi.fn(), workerFactory)
      request.cancel()
      request.cancel()
      expect(latest().terminated).toBe(1)
    })
  })

  describe('沒有 Worker 時的降級（FR-19.6）', () => {
    it('改在主執行緒產題，並同樣遵守最短載入時間', () => {
      const onDone = vi.fn()
      requestPuzzle('easy', onDone, vi.fn(), noWorkerFactory)

      expect(FakeWorker.instances).toHaveLength(0)
      expect(onDone).not.toHaveBeenCalled()

      vi.advanceTimersByTime(MIN_SKELETON_MS)
      expect(onDone).toHaveBeenCalledTimes(1)
    })

    it('產出的題目仍符合難度區間', () => {
      const onDone = vi.fn()
      requestPuzzle('hard', onDone, vi.fn(), noWorkerFactory)
      vi.advanceTimersByTime(MIN_SKELETON_MS)

      const [puzzle] = onDone.mock.calls[0]
      expect(puzzle.givens).toBeGreaterThanOrEqual(26)
      expect(puzzle.givens).toBeLessThanOrEqual(30)
    })

    it('降級期間取消，不會交出結果', () => {
      const onDone = vi.fn()
      const request = requestPuzzle('easy', onDone, vi.fn(), noWorkerFactory)

      request.cancel()
      vi.advanceTimersByTime(MIN_SKELETON_MS * 2)

      expect(onDone).not.toHaveBeenCalled()
    })
  })
})
