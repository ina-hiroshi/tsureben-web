import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      const message =
        this.state.error?.message || String(this.state.error) || '不明なエラー';
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#fff5e9',
            color: '#5a3e28',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
            画面の表示中に問題が発生しました
          </h1>
          <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px', wordBreak: 'break-word' }}>
            {message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#5a3e28',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 20px',
              fontSize: '14px',
            }}
          >
            再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
