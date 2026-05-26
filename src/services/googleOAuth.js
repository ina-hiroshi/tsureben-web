const DEFAULT_OAUTH_CLIENT_ID =
  '77789669140-61nhedsb0v3i2qsthnsq0pm7nba0ahkr.apps.googleusercontent.com';

const VERIFIER_KEY = 'tsureben_oauth_verifier';
const REDIRECT_URI_KEY = 'tsureben_oauth_redirect_uri';
const HASH_KEY = 'tsureben_oauth_hash';

export function isLocalhost() {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function getOAuthClientId() {
  return import.meta.env.VITE_OAUTH_CLIENT_ID || DEFAULT_OAUTH_CLIENT_ID;
}

/** GCP 登録 URI と常に一致させる（127.0.0.1 / ポート差異を吸収） */
export function getLocalhostRedirectUri() {
  if (import.meta.env.VITE_OAUTH_REDIRECT_URI) {
    return import.meta.env.VITE_OAUTH_REDIRECT_URI;
  }
  const port = import.meta.env.VITE_DEV_PORT || '5173';
  return `http://localhost:${port}/oauth-callback`;
}

/** 127.0.0.1 で開かれた場合は localhost に統一（OAuth redirect_uri 不一致を防ぐ） */
export function normalizeLocalhostOrigin() {
  if (!isLocalhost() || window.location.hostname === 'localhost') return false;
  const url = new URL(window.location.href);
  url.hostname = 'localhost';
  window.location.replace(url.toString());
  return true;
}

function generateRandomString(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36))
    .join('')
    .slice(0, length);
}

async function sha256Base64Url(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const binary = String.fromCharCode(...new Uint8Array(hash));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function storeOAuthSession(redirectUri, verifier) {
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(REDIRECT_URI_KEY, redirectUri);
  localStorage.setItem(REDIRECT_URI_KEY, redirectUri);
}

export function readOAuthRedirectUri() {
  return (
    sessionStorage.getItem(REDIRECT_URI_KEY) ||
    localStorage.getItem(REDIRECT_URI_KEY) ||
    getLocalhostRedirectUri()
  );
}

/** localhost 向け OAuth（Authorization Code + PKCE） */
export async function buildOAuthRedirect(redirectUri = getLocalhostRedirectUri()) {
  const verifier = generateRandomString(64);
  const challenge = await sha256Base64Url(verifier);
  storeOAuthSession(redirectUri, verifier);

  const params = new URLSearchParams({
    client_id: getOAuthClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Implicit Flow（timetable-frontend 同等・Cursor 向けフォールバック） */
export function getOAuthUrlImplicit(redirectUri = getLocalhostRedirectUri()) {
  localStorage.setItem(REDIRECT_URI_KEY, redirectUri);
  const params = new URLSearchParams({
    client_id: getOAuthClientId(),
    redirect_uri: redirectUri,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce: Math.random().toString(36).substring(2),
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function readStoredOAuthHash() {
  const fromStorage = sessionStorage.getItem(HASH_KEY);
  if (fromStorage) {
    sessionStorage.removeItem(HASH_KEY);
    return fromStorage.startsWith('#') ? fromStorage : `#${fromStorage}`;
  }
  return window.location.hash;
}

export async function exchangeCodeForIdToken(code, redirectUri = readOAuthRedirectUri()) {
  return exchangeCodeViaFunction(code, redirectUri);
}

async function exchangeCodeViaFunction(code, redirectUri) {
  const url =
    import.meta.env.VITE_OAUTH_EXCHANGE_URL ||
    'https://asia-northeast1-tsureben.cloudfunctions.net/exchangeOAuthCode';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'サーバーでのトークン交換に失敗しました');
  }

  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(REDIRECT_URI_KEY);
  localStorage.removeItem(REDIRECT_URI_KEY);

  if (!data.id_token) {
    throw new Error('IDトークンが取得できませんでした');
  }
  return data.id_token;
}

export function isEmbeddedBrowser() {
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }

  const ua = navigator.userAgent || '';
  if (/Electron|Cursor|VSCode|vscode-webview|WebView/i.test(ua)) {
    return true;
  }

  return false;
}

export function shouldUseGoogleRedirect() {
  if (isLocalhost()) return false;
  if (isEmbeddedBrowser()) return true;
  if (typeof URLSearchParams !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'redirect') return true;
  }
  return false;
}

export function getExternalLoginUrl() {
  const url = new URL(window.location.href);
  url.hostname = 'localhost';
  url.searchParams.set('auth', 'redirect');
  return url.toString();
}

export function completeOAuthLogin(returnUrl = '/home') {
  localStorage.removeItem('oauthReturnUrl');
  window.location.replace(returnUrl);
}
