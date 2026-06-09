import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { resolveUserEmail } from '../utils/resolveUserEmail';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [email, setEmail] = useState(null);
  const [userName, setUserName] = useState('');
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 認証初期化がネイティブ環境などでハングしても画面が固まらないよう、
    // 一定時間で loading を解除するセーフティタイマー。
    const safety = setTimeout(() => setLoading(false), 8000);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(safety);
      if (user) {
        const resolvedEmail = resolveUserEmail(user);
        const name =
          (typeof user.displayName === 'string' && user.displayName.trim()) ||
          resolvedEmail ||
          '';
        setEmail(resolvedEmail);
        setUid(user.uid);
        setUserName(name);
        if (resolvedEmail) {
          localStorage.setItem('email', resolvedEmail);
          localStorage.setItem('userName', name);
        }
      } else {
        setEmail(null);
        setUid(null);
        setUserName('');
        localStorage.removeItem('email');
        localStorage.removeItem('userName');
      }
      setLoading(false);
    });
    return () => {
      clearTimeout(safety);
      unsubscribe();
    };
  }, []);

  // 公開ルート（ログイン画面など）は認証初期化を待たずに描画する。
  // 保護ページは ProtectedRoute 側で loading を見て制御するため、
  // ここで全体を隠すと初期化ハング時に「背景のみ」になってしまう。
  return (
    <AuthContext.Provider value={{ email, uid, userName, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
