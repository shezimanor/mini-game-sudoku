/**
 * 關聯格（peers）：與某格同列、同行、同宮的 20 格。
 * 用於確定答案後的筆記清除（FR-21.15）。
 */

const CACHE: number[][] = []

export function peerIndices(index: number): number[] {
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

