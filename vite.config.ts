import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://shezimanor.github.io/mini-game-sudoku/
  base: '/mini-game-sudoku/',
  plugins: [react()],
  test: {
    // 目前只測純邏輯，不需要 DOM 環境
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
