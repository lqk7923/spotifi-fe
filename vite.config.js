import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'
import benchmarkFixture from './benchmarks/fixture-plugin.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = {
    '/track': {
      target: env.API_PROXY_TARGET || 'http://localhost:8080',
      changeOrigin: true,
    },
    '^/album/[^/]+/tracks(?:\\?.*)?$': {
      target: env.API_PROXY_TARGET || 'http://localhost:8080',
      changeOrigin: true,
    },
  }
  return {
    plugins: [react(), tailwindcss(), benchmarkFixture()],
    server: { proxy },
    preview: { proxy },
  }
})
