import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub project pages: https://<user>.github.io/sinyal/
const base = process.env.GITHUB_PAGES === 'true' ? '/sinyal/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
})
