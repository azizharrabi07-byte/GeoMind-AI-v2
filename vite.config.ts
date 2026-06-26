import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    secure: false,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    proxy: apiProxy,
  },
  preview: {
    port: 5173,
    host: true,
    strictPort: true,
    proxy: apiProxy,
  },
})