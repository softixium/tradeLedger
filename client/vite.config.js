import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/html2canvas") ||
            id.includes("node_modules/jspdf") ||
            id.includes("node_modules/canvg")
          ) {
            return "pdf-tools";
          }
        },
      },
    },
  },
})
