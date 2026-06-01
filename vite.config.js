import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Capacitor の capacitor://localhost スキームでは crossorigin 付き module script が
// CORS で読み込み失敗し、アプリが起動しない（背景のみ表示）。
// ビルド後の index.html から crossorigin 属性を除去する。
const stripCrossOrigin = {
  name: 'strip-crossorigin',
  transformIndexHtml(html) {
    return html.replace(/\s+crossorigin/g, '')
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), stripCrossOrigin],
  build: {
    // WKWebView(iOS 14+) で未対応構文が混入しないよう明示。
    target: ['es2020', 'safari14']
  }
});