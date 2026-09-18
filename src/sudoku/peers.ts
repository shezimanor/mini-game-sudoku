/**
 * 關聯格（peers）：與某格同列、同行、同宮的 20 格。
 * 用於確定答案後的筆記清除（FR-21.15）。
 */

const CACHE: number[][] = []

/**
 * 回傳的是快取中的同一個陣列，因此型別標為 readonly：
 * 呼叫端若對它 sort 或 push，會永久污染快取，症狀還會出現在無關的地方。
 */
export function peerIndices(index: number): readonly number[] {
  const cached = CACHE[index]
  if (cached) return cached

  const row = Math.floor(index / 9)
  const col = index % 9
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  const peers = new Set<number>()

  for (let i = 0; i < 9; i++) {
    peers.add(row * 9 + i)
    peers.add(i * 9 + col)
    peers.add((boxRow + Math.floor(i / 3)) * 9 + boxCol + (i % 3))
  }
  peers.delete(index)

  const result = [...peers]
  CACHE[index] = result
  return result
}

