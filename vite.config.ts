import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/proxy/ai': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/ai/, ''),
      },
    },
  },
})
