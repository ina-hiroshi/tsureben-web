import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [
        '@codetrix-studio/capacitor-google-auth' // ✅ 外部依存として無視させる
      ]
    }
  }
});