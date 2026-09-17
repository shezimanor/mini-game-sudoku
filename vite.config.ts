import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://shezimanor.github.io/mini-game-sudoku/
  base: '/mini-game-sudoku/',
  plugins: [react()],
})
