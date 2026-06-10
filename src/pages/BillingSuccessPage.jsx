import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signInWithRedirect,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AppLogo from '../components/ui/AppLogo';
import { auth } from '../firebase';
import { claimBillingSchoolAdmin } from '../services/billingApi';
import { useAuth } from '../contexts/AuthContext';
import {
  shouldUseGoogleRedirect,
  isLocalhost,
} from '../services/googleOAuth';

const IOS_CLIENT_ID =
  '77789669140-inaoihtj3lg3q0sqbfb0cjqmoduu1oes.apps.googleusercontent.com';
const WEB_CLIENT_ID =
  '77789669140-61nhedsb0v3i2qsthnsq0pm7nba0ahkr.apps.googleusercontent.com';

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const { email, loading: authLoading } = useAuth();
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const runClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      await claimBillingSchoolAdmin();
      setClaimed(true);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || '管理者の紐づけに失敗しました');
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (authLoading || !email || claimed || claiming) return;
    runClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, email]);

  const handleGoogleLogin = async () => {
    setError(null);
    setClaiming(true);
    const isNative = Capacitor.isNativePlatform();
    try {
      if (isNative) {
        const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
        if (!GoogleAuth) throw new Error('GoogleAuth が利用できません');
        if (GoogleAuth.initialize) {
          await GoogleAuth.initialize({
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
          });
        }
        const googleUser = await GoogleAuth.signIn({
          clientId: IOS_CLIENT_ID,
          webClientId: WEB_CLIENT_ID,
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
          forceCodeForRefreshToken: true,
        });
        const idToken = googleUser?.authentication?.idToken;
        const accessToken = googleUser?.authentication?.accessToken;
        if (!idToken || !accessToken) throw new Error('Google トークンの取得に失敗しました');
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        await signInWithCredential(auth, credential);
      } else {
        await setPersistence(auth, browserLocalPersistence);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        if (shouldUseGoogleRedirect() && !isLocalhost()) {
          await signInWithRedirect(auth, provider);
          return;
        }
        await signInWithPopup(auth, provider);
      }
      await runClaim();
    } catch (err) {
      setError(err.message || 'Google ログインに失敗しました');
      setClaiming(false);
    }
  };

  return (
    <div
      className="min-h-dvh bg-tsure-bg p-4"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex justify-center pt-4">
          <AppLogo variant="login" theme="dark" />
        </div>
        <Card>
          <h1 className="text-xl font-bold text-tsure-primary mb-2">お申し込みありがとうございます</h1>
          <p className="text-sm text-tsure-muted mb-4">
            契約の処理が完了しました。続いて、申込時と同じ Google アカウントで管理者ログインし、学校管理画面へ進んでください。
          </p>
          {!email && (
            <Button type="button" onClick={handleGoogleLogin} disabled={claiming} className="w-full">
              {claiming ? '処理中...' : 'Google で管理者ログイン'}
            </Button>
          )}
          {email && claiming && (
            <p className="text-sm text-tsure-muted">管理者アカウントを紐づけています...</p>
          )}
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </Card>
      </div>
    </div>
  );
}
