import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
    server: {
      deps: {
        inline: ['@exodus/bytes'],
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api/go': {
        target: process.env.GO_API_TARGET || 'http://localhost',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: process.env.API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    }
  }
})
