/**
 * 遊戲計時器（FR-5.1 ~ FR-5.6）。
 * running 為 false 時累計暫停，再次為 true 時從暫停處接續。
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const TICK_MS = 200

export function useTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  /** 先前已累計的毫秒數，不含本次計時區間 */
  const accumulated = useRef(0)
  const startedAt = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return

    startedAt.current = performance.now()
    const id = window.setInterval(() => {
      setElapsed(accumulated.current + (performance.now() - startedAt.current!))
    }, TICK_MS)

    return () => {
      window.clearInterval(id)
      if (startedAt.current !== null) {
        accumulated.current += performance.now() - startedAt.current
        startedAt.current = null
        setElapsed(accumulated.current)
      }
    }
  }, [running])

  const reset = useCallback(() => {
    accumulated.current = 0
    startedAt.current = performance.now()
    setElapsed(0)
  }, [])

  return { elapsed, reset }
}

/** 格式化為 hh:mm:ss（FR-5.2） */
export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return [hh, mm, ss].map((n) => String(n).padStart(2, '0')).join(':')
}
