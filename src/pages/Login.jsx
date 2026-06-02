import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PasswordInput from '../components/ui/PasswordInput';
import AppLogo from '../components/ui/AppLogo';
import FullScreenLoader from '../components/ui/FullScreenLoader';
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
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  sendVerificationCode,
  verifyCode,
  createSelfRegisteredStudent,
  resetPasswordWithCode,
  registerAppleStudent,
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
  isNativeApp,
  isWebPlatform,
  isTeacherEmail,
  getUserRegistrationType,
  canUseWebAsStudent,
} from '../utils/platformAccess';
import { signInWithApple, isAppleLoginCancelled } from '../utils/appleAuth';
import { getAppStoreUrl } from '../constants/appLinks';
import {
  consumePostLoginReturnUrl,
  peekPostLoginReturnUrl,
  resolveDefaultPostLoginPath,
} from '../utils/postLoginRedirect';

const IOS_CLIENT_ID =
  '77789669140-inaoihtj3lg3q0sqbfb0cjqmoduu1oes.apps.googleusercontent.com';
const WEB_CLIENT_ID =
  '77789669140-61nhedsb0v3i2qsthnsq0pm7nba0ahkr.apps.googleusercontent.com';

function formatStudentAuthError(err, fallback) {
  if (err?.code === 'auth/operation-not-allowed') {
    return 'メール／パスワードでのログインが有効になっていません。Firebase Console の Authentication → ログイン方法 で「メール/パスワード」を有効にしてください。';
  }
  if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
    return 'メールアドレスまたはパスワードが正しくありません';
  }
  if (err?.code === 'auth/account-exists-with-different-credential') {
    return 'このメールアドレスは別の方法で登録されています。メールとパスワードでログインしてください';
  }
  return err?.message || fallback;
}

async function signInStudent({ customToken, email, password }) {
  if (customToken) {
    return signInWithCustomToken(auth, customToken);
  }
  return signInWithEmailAndPassword(auth, email, password);
}

export default function Login() {
  const navigate = useNavigate();
  const { email, loading } = useAuth();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationStep, setShowVerificationStep] = useState(false);
  const [pendingRegister, setPendingRegister] = useState(null);
  const [pendingReset, setPendingReset] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  const webPlatform = isWebPlatform();
  const nativeApp = isNativeApp();
  const appStoreUrl = getAppStoreUrl();

  useEffect(() => {
    normalizeLocalhostOrigin();
  }, []);

  useEffect(() => {
    if (!loading && email) {
      resolveDefaultPostLoginPath(email).then(async (fallback) => {
        if (!fallback) {
          if (webPlatform) {
            const regType = await getUserRegistrationType(email);
            if (!canUseWebAsStudent(regType) && !(await isTeacherEmail(email))) {
              await signOut(auth);
              setError('一般ユーザーは iOS アプリからご利用ください');
            }
          }
          return;
        }
        navigate(consumePostLoginReturnUrl(fallback), { replace: true });
      });
    }
  }, [email, loading, navigate, webPlatform]);

  useEffect(() => {
    // リダイレクトログインは Web のみ。ネイティブ(WKWebView)では
    // GoogleAuth ネイティブプラグイン + signInWithCredential を使うため不要で、
    // initializeAuth に redirect resolver を渡していないと
    // getRedirectResult は auth/argument-error を投げる。
    if (Capacitor.isNativePlatform()) return;
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
    if (webPlatform) {
      const isTeacher = await isTeacherEmail(user.email);
      if (!isTeacher) {
        const regType = await getUserRegistrationType(user.email);
        if (!canUseWebAsStudent(regType)) {
          await signOut(auth);
          setError('一般ユーザーは iOS アプリからご利用ください');
          return;
        }
      }
    }

    await ensureUserDoc(user);
    const fallback = await resolveDefaultPostLoginPath(user.email);
    if (!fallback) {
      await signOut(auth);
      setError('このアカウントでは Web 版にログインできません');
      return;
    }
    navigate(consumePostLoginReturnUrl(fallback));
  };

  const handleAppleLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await signInWithApple();
      await registerAppleStudent();
      await finishLogin(result.user);
    } catch (err) {
      if (isAppleLoginCancelled(err)) return;
      console.error('Apple login error:', err);
      if (err?.code === 'auth/account-exists-with-different-credential') {
        setError('このメールアドレスはメール/パスワードで登録済みです。メールでログインしてください');
      } else {
        setError(err.message || 'Apple ID ログインに失敗しました');
      }
    } finally {
      setSubmitting(false);
    }
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
        // 念のため初期化（未初期化だとネイティブで googleSignIn が nil となり
        // signIn 時にクラッシュするため）。冪等なので毎回呼んで問題ない。
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
      const result = await signInStudent({
        email: studentEmail.trim(),
        password: studentPassword,
      });
      await finishLogin(result.user);
    } catch (err) {
      console.error('Student login error:', err);
      setError(formatStudentAuthError(err, 'ログインに失敗しました'));
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (mode) => {
    setError(null);
    setShowVerificationStep(false);
    setVerificationCode('');
    setStudentPassword('');
    setConfirmPassword('');
    setResetPassword('');
    setResetConfirm('');
    setPendingRegister(null);
    setPendingReset(null);
    setIsRegisterMode(mode === 'register');
    setIsResetMode(mode === 'reset');
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
      await sendVerificationCode({ email: studentEmail.trim(), purpose: 'register' });
      setPendingRegister({ email: studentEmail.trim(), password: studentPassword });
      setShowVerificationStep(true);
    } catch (err) {
      setError(err.message || '認証コードの送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendResetCode = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendVerificationCode({ email: studentEmail.trim(), purpose: 'reset' });
      setPendingReset({ email: studentEmail.trim() });
      setShowVerificationStep(true);
    } catch (err) {
      setError(err.message || '認証コードの送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    if (!pendingReset) return;
    setError(null);
    if (resetPassword !== resetConfirm) {
      setError('パスワードが一致しません');
      return;
    }
    if (resetPassword.length < 6) {
      setError('パスワードは6文字以上にしてください');
      return;
    }
    setSubmitting(true);
    try {
      const code = verificationCode.trim();
      await verifyCode({ email: pendingReset.email, code });
      const resetResult = await resetPasswordWithCode({
        email: pendingReset.email,
        code,
        newPassword: resetPassword,
      });
      const result = await signInStudent({
        customToken: resetResult?.customToken,
        email: pendingReset.email,
        password: resetPassword,
      });
      await finishLogin(result.user);
    } catch (err) {
      setError(formatStudentAuthError(err, 'パスワードの再設定に失敗しました'));
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
      const registerResult = await createSelfRegisteredStudent({
        email: pendingRegister.email,
        password: pendingRegister.password,
      });
      const result = await signInStudent({
        customToken: registerResult?.customToken,
        email: pendingRegister.email,
        password: pendingRegister.password,
      });
      await finishLogin(result.user);
    } catch (err) {
      setError(formatStudentAuthError(err, '登録に失敗しました'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FullScreenLoader label="起動しています…" />;

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

          {webPlatform && (
            <p className="text-xs text-gray-500 mb-4 text-center leading-relaxed">
              学校から配布されたアカウントはこちらからログインできます。
              <br />
              一般ユーザーの方は iOS アプリをご利用ください。
            </p>
          )}

          {!showVerificationStep && (
            <form
              onSubmit={
                isResetMode
                  ? handleSendResetCode
                  : isRegisterMode
                    ? handleSendVerificationCode
                    : handleStudentLogin
              }
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
              {!isResetMode && (
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
              )}
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
              {isRegisterMode && (
                <p className="text-xs text-gray-500">
                  一般ユーザーの場合はメールに認証コードが送信されます。アカウント削除はログイン後、設定画面から行えます。
                </p>
              )}
              {isResetMode && (
                <p className="text-xs text-gray-500">
                  登録済みのメールアドレスに認証コードを送信します
                </p>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting
                  ? '処理中...'
                  : isRegisterMode || isResetMode
                    ? '認証コードを送信'
                    : 'ログイン'}
              </Button>
              {isRegisterMode || isResetMode ? (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full text-sm text-tsure-primary underline min-h-touch"
                >
                  ログインに戻る
                </button>
              ) : (
                nativeApp && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="w-full text-sm text-tsure-primary underline min-h-touch"
                    >
                      新規登録（認証コード必要）
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="w-full text-sm text-tsure-primary underline min-h-touch"
                    >
                      パスワードを忘れた方はこちら
                    </button>
                  </div>
                )
              )}
            </form>
          )}

          {webPlatform && !showVerificationStep && appStoreUrl && (
            <p className="mt-4 text-center text-xs">
              <a
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-tsure-primary underline"
              >
                App Store でアプリを入手
              </a>
            </p>
          )}

          {showVerificationStep && (
            <form
              onSubmit={isResetMode ? handleVerifyAndReset : handleVerifyAndRegister}
              className="space-y-4"
            >
              <p className="text-sm text-[#5a3e28]">
                {(isResetMode ? pendingReset?.email : pendingRegister?.email)} に送信された6桁の認証コードを入力してください
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
              {isResetMode && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#5a3e28] mb-1">
                      新しいパスワード
                    </label>
                    <PasswordInput
                      required
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#5a3e28] mb-1">
                      新しいパスワード（確認）
                    </label>
                    <PasswordInput
                      required
                      value={resetConfirm}
                      onChange={(e) => setResetConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting
                  ? '処理中...'
                  : isResetMode
                    ? 'パスワードを再設定'
                    : '登録を完了'}
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

        {nativeApp && !showVerificationStep && !isRegisterMode && !isResetMode && (
          <Button
            type="button"
            disabled={submitting}
            className="w-full"
            onClick={handleAppleLogin}
          >
            {submitting ? '処理中...' : 'Apple IDで登録 / ログイン'}
          </Button>
        )}

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

        <p className="text-center text-xs text-tsure-on-primary/80">
          <Link to="/privacy" className="underline hover:text-white">
            プライバシーポリシー
          </Link>
        </p>
      </div>
    </div>
  );
}
