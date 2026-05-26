import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [email, setEmail] = useState(null);
  const [userName, setUserName] = useState('');
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const name =
          (typeof user.displayName === 'string' && user.displayName.trim()) ||
          user.email ||
          '';
        setEmail(user.email);
        setUid(user.uid);
        setUserName(name);
        if (user.email) {
          localStorage.setItem('email', user.email);
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
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ email, uid, userName, loading }}>
      {!loading && children}
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
