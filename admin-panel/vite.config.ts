import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy all backend routes to the Rust API
      '/api/admin': 'http://127.0.0.1:3000',
      '/auth': 'http://127.0.0.1:3000',
      '/api': 'http://127.0.0.1:3000',
      '/progress': 'http://127.0.0.1:3000',
      '/ratings': 'http://127.0.0.1:3000',
      '/voice': 'http://127.0.0.1:3000',
      '/speakup': 'http://127.0.0.1:3000',
      '/speaking-ai': 'http://127.0.0.1:3000',
    },
  },
})
