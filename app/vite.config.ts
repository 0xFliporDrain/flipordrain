import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: resolve('node_modules', 'buffer'),
    },
  },
  optimizeDeps: {
    include: ['buffer'],
    esbuildOptions: {
      define: { global: 'globalThis' },
    },
  },
})
