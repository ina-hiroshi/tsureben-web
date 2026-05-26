import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { ensureUserDoc } from '../utils/ensureUserDoc';
import {
  exchangeCodeForIdToken,
  readStoredOAuthHash,
  completeOAuthLogin,
  readOAuthRedirectUri,
  getLocalhostRedirectUri,
  normalizeLocalhostOrigin,
} from '../services/googleOAuth';

function parseOAuthCallback() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashSource = readStoredOAuthHash();
  const hashParams = new URLSearchParams(
    hashSource.startsWith('#') ? hashSource.substring(1) : hashSource
  );

  return {
    code: searchParams.get('code'),
    error:
      searchParams.get('error') ||
      searchParams.get('error_description') ||
      hashParams.get('error') ||
      hashParams.get('error_description'),
    idToken: hashParams.get('id_token'),
    redirectUri: readOAuthRedirectUri(),
    debug: import.meta.env.DEV
      ? {
          pathname: window.location.pathname,
          origin: window.location.origin,
          redirectUri: readOAuthRedirectUri(),
          search: window.location.search,
          hashLength: hashSource.length,
          hasCode: !!searchParams.get('code'),
          hasIdToken: !!hashParams.get('id_token'),
        }
      : null,
  };
}

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (normalizeLocalhostOrigin()) return;

    const handleCallback = async () => {
      const parsed = parseOAuthCallback();

      if (parsed.error) {
        setError(`認証エラー: ${parsed.error}`);
        setLoading(false);
        return;
      }

      try {
        let idToken = parsed.idToken;

        // Authorization Code は secret 設定時のみ（通常の localhost 開発では Implicit Flow を使用）
        if (!idToken && parsed.code) {
          idToken = await exchangeCodeForIdToken(parsed.code, parsed.redirectUri);
        }

        if (!idToken) {
          const hint =
            'IDトークンが取得できませんでした。Cursor 内蔵ブラウザでは URL の # フラグメントが消える場合があります。';
          setError(
            import.meta.env.DEV
              ? `${hint}\n\nデバッグ: ${JSON.stringify(parsed.debug)}`
              : `${hint}\nhttp://localhost:5173 を Chrome / Safari で開いて試してください。`
          );
          setLoading(false);
          return;
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        await ensureUserDoc(result.user);

        const returnUrl = localStorage.getItem('oauthReturnUrl') || '/home';
        completeOAuthLogin(returnUrl);
      } catch (err) {
        console.error('OAuth callback error:', err);
        const detail = import.meta.env.DEV && parsed.debug
          ? `\n\nデバッグ: ${JSON.stringify(parsed.debug)}`
          : '';
        setError(`${err.message || '認証に失敗しました'}${detail}`);
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ede3d2]">
        <div className="text-center text-[#5a3e28]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a3e28] mx-auto" />
          <p className="mt-4">認証処理中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ede3d2] p-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-lg">
          <p className="text-red-600 mb-4 whitespace-pre-wrap text-sm">{error}</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="bg-[#5a3e28] text-white px-4 py-2 rounded hover:bg-[#7a5639]"
            >
              ログイン画面に戻る
            </button>
            <a
              href="http://localhost:5173/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#5a3e28] underline"
            >
              外部ブラウザ（Chrome / Safari）で開く
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
