import { describe, expect, it } from 'vitest'
import { peerIndices } from './peers'

const ALL_INDICES = Array.from({ length: 81 }, (_, i) => i)

const rowOf = (index: number) => Math.floor(index / 9)
const colOf = (index: number) => index % 9
const boxOf = (index: number) =>
  Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3)

/** 與 peers.ts 無關的定義：共享列、行或宮，且不是自己 */
const isPeerOf = (index: number) => (other: number) =>
  other !== index &&
  (rowOf(other) === rowOf(index) ||
    colOf(other) === colOf(index) ||
    boxOf(other) === boxOf(index))

const rc = (row: number, col: number) => row * 9 + col

describe('peerIndices', () => {
  it('每一格都有 20 個關聯格', () => {
    // 列 8 + 行 8 + 宮 8，其中宮與列、宮與行各重疊 2 格 → 24 - 4 = 20
    for (const index of ALL_INDICES) {
      expect(peerIndices(index)).toHaveLength(20)
    }
  })

  it('不包含自己', () => {
    for (const index of ALL_INDICES) {
      expect(peerIndices(index)).not.toContain(index)
    }
  })

  it('沒有重複的索引', () => {
    for (const index of ALL_INDICES) {
      const peers = peerIndices(index)
      expect(new Set(peers).size).toBe(peers.length)
    }
  })

  it('每一格的結果都與獨立定義一致', () => {
    for (const index of ALL_INDICES) {
      const expected = ALL_INDICES.filter(isPeerOf(index))
      expect([...peerIndices(index)].sort((a, b) => a - b)).toEqual(expected)
    }
  })

  it('關聯關係是對稱的', () => {
    for (const index of ALL_INDICES) {
      for (const peer of peerIndices(index)) {
        expect(peerIndices(peer)).toContain(index)
      }
    }
  })

  describe('各種位置', () => {
    it('左上角（0,0）', () => {
      const peers = new Set(peerIndices(rc(0, 0)))
      expect(peers.has(rc(0, 8))).toBe(true) // 同列最右
      expect(peers.has(rc(8, 0))).toBe(true) // 同行最下
      expect(peers.has(rc(2, 2))).toBe(true) // 同宮對角
      expect(peers.has(rc(1, 3))).toBe(false) // 不同列行宮
      expect(peers.size).toBe(20)
    })

    it('正中央（4,4）', () => {
      const peers = new Set(peerIndices(rc(4, 4)))
      expect(peers.has(rc(4, 0))).toBe(true)
      expect(peers.has(rc(0, 4))).toBe(true)
      expect(peers.has(rc(3, 3))).toBe(true)
      expect(peers.has(rc(5, 5))).toBe(true)
      expect(peers.has(rc(0, 0))).toBe(false)
      expect(peers.size).toBe(20)
    })

    it('右上角（0,8）', () => {
      const peers = new Set(peerIndices(rc(0, 8)))
      expect(peers.has(rc(0, 0))).toBe(true)
      expect(peers.has(rc(8, 8))).toBe(true)
      expect(peers.has(rc(2, 6))).toBe(true)
      expect(peers.has(rc(8, 0))).toBe(false)
      expect(peers.size).toBe(20)
    })

    it('右下角（8,8）', () => {
      const peers = new Set(peerIndices(rc(8, 8)))
      expect(peers.has(rc(8, 0))).toBe(true)
      expect(peers.has(rc(0, 8))).toBe(true)
      expect(peers.has(rc(6, 6))).toBe(true)
      expect(peers.has(rc(0, 0))).toBe(false)
      expect(peers.size).toBe(20)
    })
  })

  describe('分組組成', () => {
    it('含同列的其他 8 格', () => {
      const index = rc(3, 5)
      const peers = peerIndices(index)
      const sameRow = peers.filter((p) => rowOf(p) === rowOf(index))
      expect(sameRow).toHaveLength(8)
    })

    it('含同行的其他 8 格', () => {
      const index = rc(3, 5)
      const peers = peerIndices(index)
      const sameCol = peers.filter((p) => colOf(p) === colOf(index))
      expect(sameCol).toHaveLength(8)
    })

    it('含同宮的其他 8 格', () => {
      const index = rc(3, 5)
      const peers = peerIndices(index)
      const sameBox = peers.filter((p) => boxOf(p) === boxOf(index))
      expect(sameBox).toHaveLength(8)
    })

    it('同宮與同列、同行各重疊 2 格', () => {
      const index = rc(3, 5)
      const peers = peerIndices(index)
      const boxAndRow = peers.filter(
        (p) => boxOf(p) === boxOf(index) && rowOf(p) === rowOf(index),
      )
      const boxAndCol = peers.filter(
        (p) => boxOf(p) === boxOf(index) && colOf(p) === colOf(index),
      )
      expect(boxAndRow).toHaveLength(2)
      expect(boxAndCol).toHaveLength(2)
    })
  })

  describe('快取', () => {
    it('同一個 index 重複呼叫回傳同一個陣列參考', () => {
      expect(peerIndices(40)).toBe(peerIndices(40))
    })

    it('不同 index 不會互相污染', () => {
      const a = peerIndices(0)
      const b = peerIndices(80)
      expect(a).not.toEqual(b)
      expect(peerIndices(0)).toEqual(a)
    })

    it('型別上擋掉會污染快取的就地改動', () => {
      // 只用來做編譯期檢查，刻意不執行：真的呼叫就會弄壞快取。
      // 若回傳型別改回可變的 number[]，@ts-expect-error 會變成多餘而讓 tsc 失敗。
      const mutate = (peers: ReturnType<typeof peerIndices>) => {
        // @ts-expect-error readonly 陣列不得就地排序
        peers.sort()
        // @ts-expect-error readonly 陣列不得新增元素
        peers.push(0)
      }
      expect(mutate).toBeTypeOf('function')
    })

    it('呼叫端先複製再改動不會影響快取', () => {
      const before = [...peerIndices(40)]
      const copy = [...peerIndices(40)]
      copy.sort((a, b) => b - a)
      copy.push(999)
      expect([...peerIndices(40)]).toEqual(before)
      expect(peerIndices(40)).toHaveLength(20)
    })
  })
})
