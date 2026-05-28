import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PasswordInput from '../components/ui/PasswordInput';
import AppLogo from '../components/ui/AppLogo';
import { Capacitor } from '@capacitor/core';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  sendVerificationCode,
  verifyCode,
  createSelfRegisteredStudent,
} from '../services/authApi';
import {
  shouldUseGoogleRedirect,
  isLocalhost,
  getOAuthUrlImplicit,
  getLocalhostRedirectUri,
  normalizeLocalhostOrigin,
} from '../services/googleOAuth';
import { ensureUserDoc } from '../utils/ensureUserDoc';
import {
  consumePostLoginReturnUrl,
  peekPostLoginReturnUrl,
  resolveDefaultPostLoginPath,
} from '../utils/postLoginRedirect';

const IOS_CLIENT_ID =
  '77789669140-inaoihtj3lg3q0sqbfb0cjqmoduu1oes.apps.googleusercontent.com';
const WEB_CLIENT_ID =
  '77789669140-61nhedsb0v3i2qsthnsq0pm7nba0ahkr.apps.googleusercontent.com';

export default function Login() {
  const navigate = useNavigate();
  const { email, loading } = useAuth();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationStep, setShowVerificationStep] = useState(false);
  const [pendingRegister, setPendingRegister] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    normalizeLocalhostOrigin();
  }, []);

  useEffect(() => {
    if (!loading && email) {
      resolveDefaultPostLoginPath(email).then((fallback) => {
        navigate(consumePostLoginReturnUrl(fallback), { replace: true });
      });
    }
  }, [email, loading, navigate]);

  useEffect(() => {
    let active = true;
    getRedirectResult(auth)
      .then(async (result) => {
        if (!active || !result?.user) return;
        await finishLogin(result.user);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Redirect login error:', err);
        setError(err.message || 'リダイレクトログインに失敗しました');
        setRedirecting(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const finishLogin = async (user) => {
    await ensureUserDoc(user);
    const fallback = await resolveDefaultPostLoginPath(user.email);
    navigate(consumePostLoginReturnUrl(fallback));
  };

  const handleTeacherLogin = async () => {
    setError(null);
    setSubmitting(true);
    const isNative = Capacitor.isNativePlatform();

    try {
      if (isNative) {
        const Cap = window.Capacitor;
        const GoogleAuth = Cap?.Plugins?.GoogleAuth;
        if (!GoogleAuth) {
          throw new Error(
            'GoogleAuth プラグインが読み込まれていません。cap sync を再実行してください。'
          );
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
        if (!idToken || !accessToken) {
          throw new Error('Google トークンの取得に失敗しました');
        }
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        const result = await signInWithCredential(auth, credential);
        await finishLogin(result.user);
      } else {
        await setPersistence(auth, browserLocalPersistence);

        if (isLocalhost()) {
          localStorage.setItem('oauthReturnUrl', peekPostLoginReturnUrl() || '/teacher');
          const redirectUri = getLocalhostRedirectUri();
          setRedirecting(true);
          // timetable-frontend 同等: localhost は Implicit Flow（secret 不要）
          window.location.href = getOAuthUrlImplicit(redirectUri);
          return;
        }

        const provider = new GoogleAuthProvider();

        if (shouldUseGoogleRedirect()) {
          setRedirecting(true);
          await signInWithRedirect(auth, provider);
          return;
        }

        try {
          const result = await signInWithPopup(auth, provider);
          await finishLogin(result.user);
        } catch (popupErr) {
          const useRedirect =
            popupErr.code === 'auth/popup-blocked' ||
            popupErr.code === 'auth/popup-closed-by-user' ||
            popupErr.code === 'auth/cancelled-popup-request' ||
            popupErr.code === 'auth/operation-not-supported-in-this-environment';

          if (useRedirect) {
            setRedirecting(true);
            await signInWithRedirect(auth, provider);
            return;
          }
          throw popupErr;
        }
      }
    } catch (err) {
      console.error('Teacher login error:', err);
      setError(err.message || 'ログインに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signInWithEmailAndPassword(
        auth,
        studentEmail.trim(),
        studentPassword
      );
      await finishLogin(result.user);
    } catch (err) {
      console.error('Student login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else {
        setError(err.message || 'ログインに失敗しました');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendVerificationCode = async (e) => {
    e.preventDefault();
    setError(null);
    if (studentPassword !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    if (studentPassword.length < 6) {
      setError('パスワードは6文字以上にしてください');
      return;
    }
    setSubmitting(true);
    try {
      await sendVerificationCode({ email: studentEmail.trim() });
      setPendingRegister({ email: studentEmail.trim(), password: studentPassword });
      setShowVerificationStep(true);
    } catch (err) {
      setError(err.message || '認証コードの送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!pendingRegister) return;
    setError(null);
    setSubmitting(true);
    try {
      await verifyCode({
        email: pendingRegister.email,
        code: verificationCode.trim(),
      });
      await createSelfRegisteredStudent({
        email: pendingRegister.email,
        password: pendingRegister.password,
      });
      const result = await signInWithEmailAndPassword(
        auth,
        pendingRegister.email,
        pendingRegister.password
      );
      await finishLogin(result.user);
    } catch (err) {
      setError(err.message || '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div
      className="min-h-screen bg-tsure-bg flex items-center justify-center p-4"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="w-full max-w-md space-y-4">
        <Card>
          <div className="flex justify-center mb-6">
            <AppLogo variant="login" />
          </div>

          {!showVerificationStep && (
            <form
              onSubmit={isRegisterMode ? handleSendVerificationCode : handleStudentLogin}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-[#5a3e28] mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  required
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#5a3e28] mb-1">
                  パスワード
                </label>
                <PasswordInput
                  required
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                />
              </div>
              {isRegisterMode && (
                <div>
                  <label className="block text-sm font-semibold text-[#5a3e28] mb-1">
                    パスワード（確認）
                  </label>
                  <PasswordInput
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              )}
              {!isRegisterMode && (
                <p className="text-xs text-gray-500">
                  学校から配布されたアカウントは認証コードなしでログインできます
                </p>
              )}
              {isRegisterMode && (
                <p className="text-xs text-gray-500">
                  自己登録の場合はメールに認証コードが送信されます
                </p>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting
                  ? '処理中...'
                  : isRegisterMode
                    ? '認証コードを送信'
                    : 'ログイン'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setError(null);
                }}
                className="w-full text-sm text-tsure-primary underline min-h-touch"
              >
                {isRegisterMode ? 'ログインに戻る' : '新規登録（認証コード必要）'}
              </button>
            </form>
          )}

          {showVerificationStep && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <p className="text-sm text-[#5a3e28]">
                {pendingRegister?.email} に送信された6桁の認証コードを入力してください
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full border rounded px-3 py-2 text-center tracking-widest"
                placeholder="000000"
              />
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? '登録中...' : '登録を完了'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowVerificationStep(false);
                  setVerificationCode('');
                }}
                className="w-full text-sm text-tsure-primary underline min-h-touch"
              >
                戻る
              </button>
            </form>
          )}

          {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
        </Card>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setError(null);
              handleTeacherLogin();
            }}
            disabled={submitting || redirecting}
            className="w-full text-sm text-tsure-on-primary underline min-h-touch disabled:opacity-50"
          >
            {redirecting
              ? 'Google へ移動中...'
              : submitting
                ? 'ログイン中...'
                : '教員専用ログインはこちら'}
          </button>
        </div>
      </div>
    </div>
  );
}
