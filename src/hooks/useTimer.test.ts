import { describe, expect, it } from 'vitest'
import { formatTime } from './useTimer'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

describe('formatTime', () => {
  it.each([
    [0, '00:00:00'],
    [5 * SECOND, '00:00:05'],
    [59 * SECOND, '00:00:59'],
    [MINUTE, '00:01:00'],
    [65 * SECOND, '00:01:05'],
    [9 * MINUTE + 9 * SECOND, '00:09:09'],
    [59 * MINUTE + 59 * SECOND, '00:59:59'],
    [HOUR, '01:00:00'],
    [HOUR + 2 * MINUTE + 5 * SECOND, '01:02:05'],
    [12 * HOUR + 34 * MINUTE + 56 * SECOND, '12:34:56'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatTime(ms)).toBe(expected)
  })

  describe('進位邊界', () => {
    it.each([
      [59 * SECOND, '00:00:59'],
      [60 * SECOND, '00:01:00'],
      [3599 * SECOND, '00:59:59'],
      [3600 * SECOND, '01:00:00'],
    ])('%i ms → %s', (ms, expected) => {
      expect(formatTime(ms)).toBe(expected)
    })
  })

  describe('毫秒無條件捨去', () => {
    it.each([
      [1, '00:00:00'],
      [999, '00:00:00'],
      [1_000, '00:00:01'],
      [1_999, '00:00:01'],
      [59_999, '00:00:59'],
    ])('%i ms → %s', (ms, expected) => {
      expect(formatTime(ms)).toBe(expected)
    })

    it('同一秒內的任何毫秒數都得到相同字串', () => {
      const outputs = new Set(
        [0, 1, 250, 500, 750, 999].map((ms) => formatTime(90 * SECOND + ms)),
      )
      expect([...outputs]).toEqual(['00:01:30'])
    })
  })

  describe('超過 24 小時', () => {
    it('小時數不歸零', () => {
      expect(formatTime(25 * HOUR)).toBe('25:00:00')
    })

    it('三位數小時照常顯示', () => {
      expect(formatTime(100 * HOUR + MINUTE)).toBe('100:01:00')
    })
  })

  describe('輸出格式', () => {
    it('分與秒永遠補到兩位', () => {
      const samples = [0, SECOND, MINUTE, HOUR, 3 * HOUR + 7 * MINUTE + 9 * SECOND]
      for (const ms of samples) {
        expect(formatTime(ms)).toMatch(/^\d{2,}:\d{2}:\d{2}$/)
      }
    })

    it('分與秒都落在 0–59', () => {
      for (let seconds = 0; seconds < 7200; seconds += 17) {
        const [, mm, ss] = formatTime(seconds * SECOND).split(':').map(Number)
        expect(mm).toBeGreaterThanOrEqual(0)
        expect(mm).toBeLessThan(60)
        expect(ss).toBeGreaterThanOrEqual(0)
        expect(ss).toBeLessThan(60)
      }
    })

    it('逐秒遞增時字串不會倒退', () => {
      let previous = ''
      for (let seconds = 0; seconds < 3700; seconds++) {
        const current = formatTime(seconds * SECOND)
        expect(current).not.toBe(previous)
        previous = current
      }
    })
  })
})
