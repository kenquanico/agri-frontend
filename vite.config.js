import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ── Change these to match your phone's IP camera app address ───────────────
const PHONE_IP   = '192.168.1.169'
const PHONE_PORT = '8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/phone-stream': {
        target: `http://${PHONE_IP}:${PHONE_PORT}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/phone-stream/, ''),
      },
    },
  },
})