import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const PHONE_IP   = '192.168.1.102'
const PHONE_PORT = '8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/phone-stream': {
        target: `http://${PHONE_IP}:${PHONE_PORT}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/phone-stream/, ''),
      },
    },
  },
})