import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import './index.css';

// ネイティブアプリ(iOS/Android)ではスクロールバーを非表示にする（CSS で制御）
if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('is-native');
}

function showBootError(err) {
  const root = document.getElementById('root');
  if (!root) return;
  const detail = (err && (err.stack || err.message)) || String(err);
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'min-height:100dvh;padding:24px;background:#fff5e9;color:#5a3e28;font-family:system-ui,sans-serif;overflow:auto;';
  const h = document.createElement('h1');
  h.textContent = '起動時にエラーが発生しました';
  h.style.cssText = 'font-size:18px;font-weight:700;margin:0 0 12px;';
  const pre = document.createElement('pre');
  pre.textContent = detail;
  pre.style.cssText =
    'font-size:11px;white-space:pre-wrap;word-break:break-word;line-height:1.5;';
  wrap.appendChild(h);
  wrap.appendChild(pre);
  root.appendChild(wrap);
}

// App とその依存（firebase.js など）の「モジュール評価時エラー」も
// フルのスタック付きで捕捉できるよう、動的 import + catch で起動する。
// （静的 import だと評価時エラーが window.onerror 経由で "Script error." に丸められる）
(async () => {
  try {
    const [{ default: App }, { default: ErrorBoundary }] = await Promise.all([
      import('./App.jsx'),
      import('./components/ErrorBoundary.jsx'),
    ]);
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (err) {
    console.error('Boot error:', err);
    showBootError(err);
  }
})();
