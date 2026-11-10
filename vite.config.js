import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' ทำให้ build ทำงานได้ทั้งบน localhost และ GitHub Pages (project site)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
})
